import type { AuthOptions } from "next-auth"
import { authEnvironment, type AuthEnvironment } from "./auth-config"
import { identityAllowed, normalizeProfile } from "./auth-policy"
import { safeCallbackUrl } from "./auth-urls"

export function createAuthOptions(env: AuthEnvironment): AuthOptions {
  const config = authEnvironment(env)
  return {
    secret: config.secret,
    providers: [{
      id: "usersau",
      name: "Users.au",
      type: "oauth",
      authorization: {
        url: `${config.identityOrigin}/oauth/authorize`,
        params: { response_type: "code", scope: config.scope },
      },
      checks: ["state"],
      token: `${config.identityOrigin}/oauth/token`,
      userinfo: `${config.identityOrigin}/api/user`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      profile: normalizeProfile,
    }],
    pages: { signIn: "/auth/login", error: "/auth/login" },
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
