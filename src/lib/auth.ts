import type { AuthOptions } from "next-auth"
import { authEnvironment, type AuthEnvironment } from "./auth-config"
import { identityAllowed, normalizeProfile } from "./auth-policy"
import { safeCallbackUrl } from "./auth-urls"
import { authPaths } from "./auth-paths"

export function createAuthOptions(env: AuthEnvironment): AuthOptions {
  const config = authEnvironment(env)
  const callbackUrl = `${config.appOrigin}${authPaths.callback}`
  return {
    secret: config.secret,
    providers: [{
      id: "usersau",
      name: "Users.au",
      type: "oauth",
      authorization: {
        url: `${config.identityOrigin}/oauth/authorize`,
        params: { response_type: "code", scope: config.scope, redirect_uri: callbackUrl },
      },
      checks: ["state"],
      client: { redirect_uris: [callbackUrl] },
      token: {
        url: `${config.identityOrigin}/oauth/token`,
        async request({ client, params, checks }) {
          // Keep state/PKCE checks and the token exchange on the same registered URI.
          return { tokens: await client.oauthCallback(callbackUrl, params, checks) }
        },
      },
      userinfo: `${config.identityOrigin}/api/user`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      profile: normalizeProfile,
    }],
    pages: { signIn: "/auth/login", error: "/auth/login", signOut: authPaths.logout },
    session: { strategy: "jwt" },
    callbacks: {
      async signIn({ user }) {
        return identityAllowed(user.usersauId, env)
      },
      async jwt({ token, user }) {
        // Project only identity/session fields; discard legacy or incoming OAuth tokens.
        return {
          sub: user?.id ?? token.sub,
          name: user?.name ?? token.name,
          email: user?.email ?? token.email,
          picture: user?.image ?? token.picture,
          usersauId: user?.usersauId ?? token.usersauId,
          iat: token.iat,
          exp: token.exp,
          jti: token.jti,
        }
      },
      async session({ session, token }) {
        return {
          expires: session.expires,
          user: {
            name: token.name,
            email: token.email,
            image: token.picture,
            usersauId: token.usersauId,
          },
        }
      },
      async redirect({ url }) {
        return `${config.appOrigin}${safeCallbackUrl(url, config.appOrigin)}`
      },
    },
    // Auth errors are intentionally reduced to codes. Never log raw token responses.
    logger: { error: code => console.error(`[auth] ${code}`), warn: code => console.warn(`[auth] ${code}`) },
  }
}

// Lazy validation allows the login page to show configuration names without secrets.
export function getAuthOptions() {
  return createAuthOptions(process.env)
}
