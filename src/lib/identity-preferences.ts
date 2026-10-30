import { randomUUID } from 'node:crypto'
import { normalizePreferences, normalizeUserInfo, PREFERENCES_CLAIM, PreferencesError, readIdentityJson, type InterfacePreferences, type PreferenceChanges } from '@users-au/client'
import { authEnvironment, type AuthEnvironment } from './auth-config'
import { credentialVault, type Grant } from './credential-vault'

export function preferenceChanges(input: unknown): { changes: PreferenceChanges; version: number } {
  if (!input || typeof input !== 'object') throw new PreferencesError(422)
  const data = input as Record<string, unknown>
  if (!Number.isSafeInteger(data.expected_version) || (data.expected_version as number) < 0) throw new PreferencesError(422)
  const changes: PreferenceChanges = {}
  for (const field of ['locale', 'timezone', 'theme'] as const) {
    if (!(field in data)) continue
    if (typeof data[field] !== 'string') throw new PreferencesError(422)
    if (field === 'locale' && (!/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(data[field]) || data[field].length > 35)) throw new PreferencesError(422)
    if (field === 'timezone') { try { new Intl.DateTimeFormat('en', { timeZone: data[field] }) } catch { throw new PreferencesError(422) } }
    if (field === 'theme' && !['system', 'light', 'dark'].includes(data[field])) throw new PreferencesError(422)
    Object.assign(changes, { [field]: data[field] })
  }
  return { changes, version: data.expected_version as number }
}

export async function grantFor(env: AuthEnvironment, id: string, subject: string): Promise<Grant> {
  const grant = await credentialVault(env).get(id)
  if (!grant || grant.sub !== subject || grant.profile.sub !== subject || grant.issuer !== authEnvironment(env).identityOrigin) throw new PreferencesError(401)
  return { ...grant, profile: normalizeUserInfo(grant.profile) }
}

export async function saveGrant(env: AuthEnvironment, grant: Grant): Promise<string> {
  const id = randomUUID()
  await credentialVault(env).set(id, grant)
  return id
}

export async function accountPreferences(env: AuthEnvironment, id: string, subject: string, input?: unknown): Promise<InterfacePreferences> {
  const config = authEnvironment(env), vault = credentialVault(env)
  let grant = await grantFor(env, id, subject)
  const mutation = input === undefined ? undefined : preferenceChanges(input)
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response
    try {
      response = await fetch(`${config.identityOrigin}/api/interface-preferences`, {
        method: mutation ? 'PATCH' : 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json', Authorization: `Bearer ${grant.accessToken}`, ...(mutation ? { 'Content-Type': 'application/json' } : {}) },
        ...(mutation ? { body: JSON.stringify({ ...mutation.changes, expected_version: mutation.version }) } : {}),
      })
    } catch { throw new PreferencesError(503) }
    if (response.status === 401 && attempt === 0 && grant.refreshToken) {
      const failedToken = grant.accessToken
      grant = await vault.withLock(id, async () => {
        const current = await grantFor(env, id, subject)
        if (current.accessToken !== failedToken) return current
        let refreshed: Response
        try {
          refreshed = await fetch(`${config.identityOrigin}/oauth/token`, { method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: current.refreshToken! }) })
        } catch { throw new PreferencesError(503) }
        if (!refreshed.ok) throw new PreferencesError([400, 401, 403].includes(refreshed.status) ? 401 : 503)
        const tokens = await readIdentityJson(refreshed) as Record<string, unknown>
        if (typeof tokens.access_token !== 'string' || !tokens.access_token) throw new PreferencesError(502)
        const next = { ...current, accessToken: tokens.access_token, refreshToken: typeof tokens.refresh_token === 'string' && tokens.refresh_token ? tokens.refresh_token : current.refreshToken }
        await vault.set(id, next)
        return next
      })
      continue
    }
    const conflict = response.status === 409
    if (!response.ok && !conflict) throw new PreferencesError([401, 403, 422].includes(response.status) ? response.status : 503)
    const data = await readIdentityJson(response)
    const snapshot = normalizePreferences(conflict ? (data as { preferences?: unknown })?.preferences : data, subject)
    const confirmed = await vault.withLock(id, async () => {
      const current = await grantFor(env, id, subject)
      const previous = current.profile[PREFERENCES_CLAIM]
      if (previous && previous.version > snapshot.version) return previous
      const profile = { ...current.profile, [PREFERENCES_CLAIM]: snapshot }
      if (snapshot.locale) profile.locale = snapshot.locale
      else delete profile.locale
      if (snapshot.timezone) profile.zoneinfo = snapshot.timezone
      else delete profile.zoneinfo
      await vault.set(id, { ...current, profile })
      return snapshot
    })
    if (conflict) throw new PreferencesError(409, confirmed)
    return confirmed
  }
  throw new PreferencesError(401)
}
