// Server implementation only. Browser sessions contain an opaque key, never this data.
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import type { AuthEnvironment } from './auth-config'
import { PreferencesError, type UsersauUser } from '@users-au/client'

export interface Grant {
  issuer: string
  sub: string
  accessToken: string
  refreshToken?: string
  profile: UsersauUser
  expiresAt: number
}
export interface CredentialVault {
  get(id: string): Promise<Grant | null>
  set(id: string, grant: Grant): Promise<void>
  remove(id: string): Promise<void>
  withLock<T>(id: string, work: () => Promise<T>): Promise<T>
}
const development = new Map<string, { value: string; expires: number }>()
const developmentLocks = new Set<string>()
const grantId = /^[a-f0-9-]{36}$/i
const seconds = 30 * 24 * 60 * 60

export function credentialVault(env: AuthEnvironment): CredentialVault {
  if (env.USERSAU_PREFERENCES_ENABLED !== 'true') throw new PreferencesError(503)
  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32 || !env.NEXTAUTH_URL || !env.USERSAU_HOST) throw new PreferencesError(503)
  let scope: string
  try { scope = `${new URL(env.NEXTAUTH_URL).origin}|${new URL(env.USERSAU_HOST).origin}` } catch { throw new PreferencesError(503) }
  const prefix = `usersau:grant:${createHash('sha256').update(scope).digest('hex').slice(0, 24)}:`
  const key = createHash('sha256').update(`usersau:grant:v1|${scope}|${env.NEXTAUTH_SECRET}`).digest()
  const url = env.USERSAU_GRANT_STORE_URL
  const token = env.USERSAU_GRANT_STORE_TOKEN
  if (env.NODE_ENV === 'production' && (!url || !token)) throw new PreferencesError(503)
  try {
    if ((url || token) && (!url || !token || new URL(url).protocol !== 'https:' || new URL(url).origin !== url.replace(/\/$/, ''))) throw new Error()
  } catch { throw new PreferencesError(503) }

  function name(id: string) { if (!grantId.test(id)) throw new PreferencesError(401); return `${prefix}${id}` }
  async function command(parts: (string | number)[]): Promise<unknown> {
    try {
      const response = await fetch(url!, { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(parts) })
      if (!response.ok) throw new Error()
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || 'error' in data || !('result' in data)) throw new Error()
      return data.result
    } catch { throw new PreferencesError(503) }
  }
  function seal(id: string, grant: Grant) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(name(id)))
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(grant)), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
  }
  function open(id: string, value: string): Grant {
    try {
      const raw = Buffer.from(value, 'base64url')
      const cipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
      cipher.setAAD(Buffer.from(name(id))); cipher.setAuthTag(raw.subarray(12, 28))
      return JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)), cipher.final()]).toString()) as Grant
    } catch { throw new PreferencesError(503) }
  }
  return {
    async get(id) {
      const path = name(id)
      const value = url ? await command(['GET', path]) : development.get(path)?.value
      if (value == null) return null
      if (typeof value !== 'string') throw new PreferencesError(503)
      const grant = open(id, value)
      if (grant.expiresAt <= Date.now()) return null
      return grant
    },
    async set(id, grant) {
      const path = name(id), revoked = `${path}:revoked`
      const ttl = Math.min(seconds, Math.ceil((grant.expiresAt - Date.now()) / 1000))
      if (ttl <= 0) throw new PreferencesError(401)
      const value = seal(id, grant)
      if (url) {
        const saved = await command(['EVAL', "if redis.call('EXISTS',KEYS[2])==1 then return 0 end redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return 1", 2, path, revoked, value, ttl])
        if (saved !== 1) throw new PreferencesError(401)
      } else {
        if ((development.get(revoked)?.expires ?? 0) > Date.now()) throw new PreferencesError(401)
        development.set(path, { value, expires: grant.expiresAt })
      }
    },
    async remove(id) {
      const path = name(id), revoked = `${path}:revoked`
      if (url) await command(['EVAL', "redis.call('SET',KEYS[2],'1','EX',ARGV[1]); return redis.call('DEL',KEYS[1])", 2, path, revoked, seconds])
      else { development.set(revoked, { value: '1', expires: Date.now() + seconds * 1000 }); development.delete(path) }
    },
    async withLock(id, work) {
      const lock = `${name(id)}:lock`, owner = randomUUID()
      if (url) {
        if (await command(['SET', lock, owner, 'NX', 'EX', 30]) !== 'OK') throw new PreferencesError(503)
      } else {
        if (developmentLocks.has(lock)) throw new PreferencesError(503)
        developmentLocks.add(lock)
      }
      try { return await work() }
      finally {
        if (url) await command(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, lock, owner])
        else developmentLocks.delete(lock)
      }
    },
  }
}
