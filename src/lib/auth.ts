import { credentialVault } from './credential-vault'
import { saveGrant } from './identity-preferences'
import { PREFERENCES_CLAIM, normalizePreferences } from '@users-au/client'
import type { AuthOptions } from "next-auth"
import { authEnvironment, type AuthEnvironment } from "./auth-config"
import { identityAllowed, normalizeProfile } from "./auth-policy"
import { safeCallbackUrl } from "./auth-urls"
import { authPaths } from "./auth-paths"

function safePreferences(value: unknown, subject: unknown) {
  if (typeof subject !== 'string' || value == null) return undefined
  try { return normalizePreferences(value, subject) } catch { return undefined }
}

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
      async jwt({ token, user, account }) {
        let credentialId = token.credentialId
        let preferences = safePreferences(user?.identityProfile?.[PREFERENCES_CLAIM] ?? token.preferences, user?.usersauId ?? token.usersauId)
        if (user && account && env.USERSAU_PREFERENCES_ENABLED === 'true') {
          if (!user.identityProfile || user.identityProfile.sub !== user.usersauId || typeof account.access_token !== 'string') throw new Error('Invalid identity profile')
          credentialId = await saveGrant(env, { issuer: config.identityOrigin, sub: user.usersauId!, profile: user.identityProfile,
            accessToken: account.access_token, refreshToken: account.refresh_token, expiresAt: Date.now() + 30 * 86400 * 1000 })
        }
        if (!user && env.USERSAU_PREFERENCES_ENABLED === 'true') {
          if (!credentialId) return {}
          try {
            const grant = await credentialVault(env).get(credentialId)
            if (!grant || grant.sub !== token.usersauId || grant.issuer !== config.identityOrigin) return {}
            preferences = grant.profile[PREFERENCES_CLAIM]
          } catch { return {} }
        }
        // Project only identity/session fields; discard legacy or incoming OAuth tokens.
        return {
          credentialId,
          preferences,
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
        let preferences = safePreferences(token.preferences, token.usersauId)
        if (token.credentialId && env.USERSAU_PREFERENCES_ENABLED === 'true') {
          try {
            const grant = await credentialVault(env).get(token.credentialId)
            if (grant && grant.sub === token.usersauId && grant.issuer === config.identityOrigin) preferences = grant.profile[PREFERENCES_CLAIM]
          } catch { /* Retain authentication; preference APIs report explicit store failures. */ }
        }
        return {
          expires: session.expires,
          user: {
            name: token.name,
            email: token.email,
            image: token.picture,
            usersauId: token.usersauId,
            preferences,
          },
        }
      },
      async redirect({ url }) {
        return `${config.appOrigin}${safeCallbackUrl(url, config.appOrigin)}`
      },
    },
    events: {
      async signOut(message) {
        if ('token' in message && message.token?.credentialId && env.USERSAU_PREFERENCES_ENABLED === 'true') {
          await credentialVault(env).remove(message.token.credentialId)
        }
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
