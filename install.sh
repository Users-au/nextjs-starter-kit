#!/bin/bash

# Next.js Usersau Starter Kit Installation Script

echo "🚀 Installing Next.js Usersau Starter Kit..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please update Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if command -v yarn &> /dev/null; then
    echo "   Using Yarn..."
    yarn install
else
    echo "   Using npm..."
    npm install
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Set up environment file
echo ""
echo "⚙️  Setting up environment file..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
else
    echo "⚠️  .env.local already exists, skipping..."
fi

# Generate NextAuth secret
echo ""
echo "🔐 Generating NextAuth secret..."
if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-secret-key-here/$SECRET/" .env.local
    else
        # Linux
        sed -i "s/your-secret-key-here/$SECRET/" .env.local
    fi
    echo "✅ NextAuth secret generated and added to .env.local"
else
    echo "⚠️  OpenSSL not found. Please manually set NEXTAUTH_SECRET in .env.local"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure your Usersau OAuth credentials in .env.local"
echo "   2. Set up your OAuth application at https://my.users.au"
echo "   3. Set redirect URI to: http://localhost:3000/api/auth/callback/usersau"
echo "   4. Run 'npm run dev' or 'yarn dev' to start the development server"
echo ""
echo "📖 For more information, see README.md"
echo "" 