# Vercel Deployment Guide

This guide will help you deploy your Next.js Usersau Starter Kit to Vercel.

## Prerequisites

- A Vercel account ([sign up here](https://vercel.com/signup))
- Your Usersau OAuth application configured
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Connect Your Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Select your repository from the list

## Step 2: Configure Build Settings

Vercel will auto-detect your Next.js project. The default settings should work fine:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## Step 3: Set Environment Variables

In the Vercel deployment configuration, add these environment variables:

### Required Variables

```bash
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-here
USERSAU_CLIENT_ID=your_usersau_client_id
USERSAU_CLIENT_SECRET=your_usersau_client_secret
USERSAU_HOST=https://your-subdomain.users.au
NEXT_PUBLIC_APP_NAME=Your App Name
NEXT_PUBLIC_USERSAU_HOST=https://your-subdomain.users.au
```

### Important Notes

- **NEXTAUTH_URL**: Must be your production domain (e.g., `https://your-app.vercel.app`)
- **NEXTAUTH_SECRET**: Generate a secure secret using `openssl rand -base64 32`
- Replace `your-app-name` with your actual Vercel app name
- Replace `your-subdomain` with your actual Usersau subdomain

## Step 4: Update Usersau OAuth Settings

1. Go to your [Usersau Developer Console](https://my.users.au)
2. Navigate to your project's OAuth Management
3. Add your production callback URL: `https://your-app-name.vercel.app/api/auth/callback/usersau`
4. Make sure both development and production URLs are configured

## Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-app-name.vercel.app`

## Step 6: Test the Deployment

1. Visit your deployed application
2. Try the OAuth login flow
3. Verify that authentication works correctly
4. Check that redirects work as expected

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Your production domain | `https://myapp.vercel.app` |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | `your-generated-secret` |
| `USERSAU_CLIENT_ID` | Your Usersau OAuth client ID | `your_client_id` |
| `USERSAU_CLIENT_SECRET` | Your Usersau OAuth client secret | `your_client_secret` |
| `USERSAU_HOST` | Your Usersau instance URL | `https://company.users.au` |
| `NEXT_PUBLIC_APP_NAME` | Your application name | `My App` |
| `NEXT_PUBLIC_USERSAU_HOST` | Public Usersau URL | `https://company.users.au` |

## Domain Configuration

### Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update `NEXTAUTH_URL` to your custom domain
5. Update the OAuth callback URL in Usersau

### Multiple Environments

For staging/preview deployments, you can set different environment variables:

- Use Vercel's environment variable scoping (Development, Preview, Production)
- Set up separate Usersau OAuth applications for different environments
- Use different `NEXTAUTH_URL` values for each environment

## Troubleshooting

### Common Issues

1. **OAuth Callback URL Mismatch**
   - Ensure the callback URL in Usersau matches your deployment URL
   - Check that `NEXTAUTH_URL` is set correctly

2. **Environment Variables Not Loading**
   - Verify all required variables are set in Vercel dashboard
   - Redeploy after adding/changing environment variables

3. **Build Failures**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are properly listed in `package.json`

4. **Authentication Not Working**
   - Verify `NEXTAUTH_SECRET` is set and secure
   - Check that Usersau OAuth credentials are correct
   - Ensure `USERSAU_HOST` URL is accessible

### Support

If you encounter issues:

1. Check the Vercel build logs
2. Review the browser console for client-side errors
3. Verify all environment variables are correctly set
4. Test OAuth flow in Usersau developer console

## Performance Optimization

The project is already optimized for Vercel with:

- **Edge Runtime**: Middleware runs at the edge for faster redirects
- **Static Generation**: Pages are statically generated where possible
- **Image Optimization**: Next.js image optimization is enabled
- **Bundle Analysis**: Check bundle size with `npm run build`

## Security Features

- **Security Headers**: Configured in `next.config.ts`
- **HTTPS Only**: All authentication flows require HTTPS in production
- **Secure Cookies**: NextAuth.js uses secure cookies in production
- **CSRF Protection**: Built-in CSRF protection for forms

Your application is now ready for production deployment on Vercel! 