# Next.js Usersau Starter Kit

A modern Next.js starter kit with Usersau OAuth integration, built with TypeScript and Tailwind CSS.

## Features

- 🔐 **Usersau OAuth Authentication** - Complete OAuth integration with Usersau
- ⚡ **Next.js 15** - Latest Next.js with App Router
- 🎨 **Modern UI** - Built with Tailwind CSS
- 📱 **Responsive Design** - Mobile-first responsive design
- 🔒 **NextAuth.js** - Secure authentication handling
- 📄 **TypeScript** - Full TypeScript support
- 🚀 **Fast Development** - Hot reload and fast refresh

## Requirements

- Node.js 18+ 
- npm or yarn
- A Usersau OAuth application

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Users-au/nextjs-starter-kit.git
   cd nextjs-starter-kit
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   
   Edit `.env.local` with your Usersau OAuth credentials:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   
   USERSAU_CLIENT_ID=your_client_id_here
   USERSAU_CLIENT_SECRET=your_client_secret_here
   USERSAU_HOST=https://your-subdomain.users.au
   
   NEXT_PUBLIC_APP_NAME="Next.js Usersau Starter Kit"
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   
   Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Usersau OAuth Setup

### 1. Register Your Application

1. Go to [Usersau Developer Console](https://my.users.au)
2. Go to / Create a new Project and go to Integration > OAuth Management
3. Create a new OAuth application
4. Set the redirect URI as: `http://localhost:3000/api/auth/callback/usersau`
5. Copy the Client ID and Client Secret

### 2. Configure Environment Variables

Update your `.env.local` file with the credentials from step 1.

## Usage

### Available Routes

- `/` - Home page (redirects to login or dashboard)
- `/auth/login` - Login page with Usersau OAuth
- `/dashboard` - Protected dashboard page
- `/api/auth/*` - NextAuth.js API routes

### Authentication Flow

1. Users visit the home page and are redirected to login
2. They click "Continue" to authenticate with Usersau
3. After successful authentication, they are redirected to the dashboard
4. User data is automatically managed by NextAuth.js

### Session Management

The application uses NextAuth.js for session management:

- Sessions are stored as JWTs
- User data includes Usersau ID, name, email, and avatar
- Access and refresh tokens are stored in the session

### Customization

#### Styling

The application uses Tailwind CSS. You can customize the design by:

- Editing the Tailwind configuration in `tailwind.config.ts`
- Modifying component styles in the page files
- Adding custom CSS in `src/app/globals.css`

#### Adding New Pages

Create new pages in the `src/app` directory following Next.js App Router conventions:

```typescript
// src/app/new-page/page.tsx
export default function NewPage() {
  return <div>New Page Content</div>
}
```

#### Protected Routes

To protect routes, use the session check pattern:

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') return <div>Loading...</div>
  if (!session) return null

  return <div>Protected content</div>
}
```

## File Structure

```
nextjs-starter-kit/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts          # NextAuth.js API routes
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx              # Login page
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Dashboard page
│   │   ├── globals.css                   # Global styles
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Home page
│   │   └── providers.tsx                 # Session provider
│   └── lib/
│       └── auth.ts                       # NextAuth.js configuration
├── .env.example                          # Environment variables example
├── package.json                          # Dependencies and scripts
├── tailwind.config.ts                    # Tailwind CSS configuration
└── tsconfig.json                         # TypeScript configuration
```

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js, Usersau OAuth 2.0
- **Development**: ESLint, PostCSS

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Update `NEXTAUTH_URL` to your production domain
5. Update OAuth redirect URI in Usersau console

### Other Platforms

The application can be deployed to any platform that supports Node.js:

- Netlify
- Railway
- Heroku
- DigitalOcean App Platform

Make sure to:
1. Set all environment variables
2. Update `NEXTAUTH_URL` to your production domain
3. Update OAuth redirect URI in Usersau console

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## Support

For support, please contact [opensource@users.au](mailto:opensource@users.au) or create an issue in the repository. 