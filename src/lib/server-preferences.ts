import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PreferencesError, type InterfacePreferences } from '@users-au/client'
import { authConfigIssues, authEnvironment } from './auth-config'
import { getAuthorizedSession, AccessError } from './server-auth'
import { accountPreferences, grantFor } from './identity-preferences'
import { preferenceCsrf } from './preference-csrf'
import { runAuthAction } from './auth-handler'

async function context(request: NextRequest) {
  const session = await getAuthorizedSession()
  const config = authEnvironment(process.env)
  if (process.env.USERSAU_PREFERENCES_ENABLED !== 'true') throw new PreferencesError(503)
  const token = await getToken({ req: request, secret: config.secret, secureCookie: config.appOrigin.startsWith('https:') })
  if (!token?.credentialId || token.usersauId !== session.user.usersauId) throw new PreferencesError(401)
  return { subject: session.user.usersauId!, id: token.credentialId, config }
}

export async function preferenceResponse(request: NextRequest, profile = false): Promise<Response> {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site') throw new PreferencesError(403)
    const { subject, id, config } = await context(request)
    let input: unknown
    if (request.method === 'PATCH') {
      const cookie = request.cookies.get(config.appOrigin.startsWith('https:') ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token')?.value
      if (!request.headers.get('content-type')?.startsWith('application/json')
          || !preferenceCsrf(request.headers.get('origin'), request.headers.get('x-csrf-token'), cookie, config.appOrigin, config.secret)) throw new PreferencesError(403)
      try { input = await request.json() } catch { throw new PreferencesError(422) }
    }
    const value = profile ? (await grantFor(process.env, id, subject)).profile : await accountPreferences(process.env, id, subject, input)
    // NextAuth updates its own encrypted/chunked cookie from server-confirmed metadata.
    const renewed: Response = await runAuthAction(new NextRequest(`${config.appOrigin}/api/auth/session`, { headers: request.headers }), ['session'])
    const output = new Headers(renewed.headers)
    output.set('cache-control', 'no-store')
    return Response.json(value, { headers: output })
  } catch (error) {
    if (error instanceof AccessError) return Response.json({ error: error.message }, { status: error.status, headers: { 'cache-control': 'no-store' } })
    const failure = error instanceof PreferencesError ? error : new PreferencesError(503)
    return Response.json({ error: failure.message, preferences: failure.preferences }, { status: failure.status, headers: { 'cache-control': 'no-store' } })
  }
}

// Deduplicate RootLayout/dashboard reads within one request, never across users.
export const pagePreferences = cache(async (): Promise<InterfacePreferences | null> => {
  if (authConfigIssues(process.env).length || process.env.USERSAU_PREFERENCES_ENABLED !== 'true') return null
  let previous: InterfacePreferences | null = null
  try {
    const session = await getAuthorizedSession()
    previous = session.user.preferences ?? null
    const request = new NextRequest(authEnvironment(process.env).appOrigin, { headers: await headers() })
    const { id, subject } = await context(request)
    return await accountPreferences(process.env, id, subject)
  } catch { return previous }
})
