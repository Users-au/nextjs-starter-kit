import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID, createHash } from 'node:crypto'
import type { AuthOptions, Session } from 'next-auth'
import { PREFERENCES_CLAIM, type InterfacePreferences } from '@users-au/client'
import { credentialVault, type Grant } from '../src/lib/credential-vault'
import { accountPreferences, grantFor, preferenceChanges, saveGrant } from '../src/lib/identity-preferences'
import { preferenceCsrf } from '../src/lib/preference-csrf'
import { authConfigIssues } from '../src/lib/auth-config'
import { createAuthOptions } from '../src/lib/auth'
import { normalizeProfile, accessDecision } from '../src/lib/auth-policy'

const env = { NODE_ENV: 'development', NEXTAUTH_URL: 'https://app.users.test', USERSAU_HOST: 'https://identity.users.test',
  NEXT_PUBLIC_USERSAU_HOST: 'https://identity.users.test', NEXTAUTH_SECRET: 'test-only-vault-key-with-at-least-32-characters',
  USERSAU_CLIENT_ID: 'client', USERSAU_CLIENT_SECRET: 'client-private', USERSAU_ACCESS_MODE: 'all', USERSAU_PREFERENCES_ENABLED: 'true' }
const snapshot = (version = 1): InterfacePreferences => ({ sub: 'one', locale: 'zh-CN', timezone: 'Australia/Sydney', theme: 'dark', version })
const record = (): Grant => ({ issuer: env.USERSAU_HOST, sub: 'one', accessToken: 'private-access', refreshToken: 'private-refresh',
  expiresAt: Date.now() + 86400000, profile: { id: 'one', sub: 'one', given_name: 'Jane', [PREFERENCES_CLAIM]: snapshot() } })

test('production requires a persistent store and rejects scope/configuration omissions', () => {
  const missing = authConfigIssues({ ...env, NODE_ENV: 'production' })
  assert.ok(missing.includes('USERSAU_GRANT_STORE_URL') && missing.includes('USERSAU_GRANT_STORE_TOKEN'))
  assert.ok(authConfigIssues({ ...env, USERSAU_SCOPE: 'profile email' }).includes('USERSAU_SCOPE'))
  assert.throws(() => credentialVault({ ...env, NODE_ENV: 'production' }))
})

test('vault records are encrypted for Redis and scoped by application/issuer', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async (_url, options) => { calls.push(String(options?.body)); return Response.json({ result: 1 }) }
  try {
    await credentialVault({ ...env, NODE_ENV: 'production', USERSAU_GRANT_STORE_URL: 'https://store.users.test', USERSAU_GRANT_STORE_TOKEN: 'redis-private' }).set(randomUUID(), record())
    assert.ok(!calls.join().includes('private-access') && !calls.join().includes('private-refresh') && !calls.join().includes('Jane'))
  } finally { globalThis.fetch = original }
  const id = await saveGrant(env, record())
  await assert.rejects(grantFor({ ...env, USERSAU_HOST: 'https://other.users.test', NEXT_PUBLIC_USERSAU_HOST: 'https://other.users.test' }, id, 'one'), { status: 401 })
  await assert.rejects(grantFor(env, id, 'other'), { status: 401 })
})

test('logout revocation prevents an in-flight refresh from resurrecting a grant', async () => {
  const vault = credentialVault(env), id = await saveGrant(env, record())
  let finish!: () => void
  const pending = vault.withLock(id, async () => { await new Promise<void>(resolve => { finish = resolve }); await vault.set(id, record()) })
  await new Promise(resolve => setImmediate(resolve))
  await assert.rejects(vault.withLock(id, async () => undefined), { status: 503 })
  await vault.remove(id); finish()
  await assert.rejects(pending, { status: 401 })
  assert.equal(await vault.get(id), null)
})

test('same-origin versioned mutations whitelist fields and keep newer confirmed snapshots', async () => {
  const id = await saveGrant(env, record()), vault = credentialVault(env)
  const original = globalThis.fetch
  let body: Record<string, unknown> = {}
  globalThis.fetch = async (_url, options) => { if (options?.body) body = JSON.parse(String(options.body)); return Response.json({ ...snapshot(2), theme: 'light' }) }
  try {
    assert.equal((await accountPreferences(env, id, 'one', { theme: 'light', expected_version: 1, user_id: 'other', issuer: 'https://bad.test' })).theme, 'light')
    assert.deepEqual(body, { theme: 'light', expected_version: 1 })
    const current = (await vault.get(id))!
    await vault.set(id, { ...current, profile: { ...current.profile, [PREFERENCES_CLAIM]: snapshot(5) } })
    assert.equal((await accountPreferences(env, id, 'one')).version, 5)
    globalThis.fetch = async () => Response.json({ preferences: snapshot(7) }, { status: 409 })
    await assert.rejects(accountPreferences(env, id, 'one', { theme: 'light', expected_version: 1 }), { status: 409, preferences: snapshot(7) })
  } finally { globalThis.fetch = original }
})

test('401 refresh rotates once without adding scopes; 403 cannot expand authority', async () => {
  const id = await saveGrant(env, record()), original = globalThis.fetch
  const calls: RequestInit[] = []
  globalThis.fetch = async (_url, options) => {
    calls.push(options!)
    return calls.length === 1 ? Response.json({}, { status: 401 }) : calls.length === 2 ? Response.json({ access_token: 'fresh' }) : Response.json(snapshot(2))
  }
  try {
    await accountPreferences(env, id, 'one')
    assert.ok(!String(calls[1].body).includes('scope='))
    assert.equal((calls[2].headers as Record<string, string>).Authorization, 'Bearer fresh')
    globalThis.fetch = async () => Response.json({ private: 'must-not-leak' }, { status: 403 })
    await assert.rejects(accountPreferences(env, id, 'one'), { status: 403, message: 'preferences_reauthorization_required' })
  } finally { globalThis.fetch = original }
})

test('CSRF requires the correct same-origin double-submit pair and rejects invalid preference inputs', () => {
  const csrf = 'nonce', hash = createHash('sha256').update(csrf + env.NEXTAUTH_SECRET).digest('hex')
  assert.equal(preferenceCsrf(env.NEXTAUTH_URL, csrf, `${csrf}|${hash}`, env.NEXTAUTH_URL, env.NEXTAUTH_SECRET), true)
  for (const [origin, nonce, cookie] of [['https://evil.test', csrf, `${csrf}|${hash}`], [env.NEXTAUTH_URL, 'other', `${csrf}|${hash}`], [env.NEXTAUTH_URL, csrf, 'nonce|forged']]) {
    assert.equal(preferenceCsrf(origin, nonce, cookie, env.NEXTAUTH_URL, env.NEXTAUTH_SECRET), false)
  }
  assert.throws(() => preferenceChanges({ expected_version: 0, timezone: 'Mars/Base' }))
  assert.throws(() => preferenceChanges({ expected_version: 0, locale: '<script>' }))
  assert.throws(() => preferenceChanges({ theme: 'auto' }))
})

test('callbacks keep credentials out of JWT/session and invalidate revoked handles', async () => {
  const callbacks = createAuthOptions(env).callbacks!
  type JwtInput = Parameters<NonNullable<NonNullable<AuthOptions['callbacks']>['jwt']>>[0]
  const user = normalizeProfile({ sub: 'one', given_name: 'Jane', [PREFERENCES_CLAIM]: snapshot() })
  const token = await callbacks.jwt!({ token: {}, user, account: { access_token: 'secret-access', refresh_token: 'secret-refresh' } } as unknown as JwtInput)
  assert.equal(typeof token.credentialId, 'string')
  assert.ok(!JSON.stringify(token).includes('secret-access') && !JSON.stringify(token).includes('secret-refresh'))
  type SessionInput = Parameters<NonNullable<NonNullable<AuthOptions['callbacks']>['session']>>[0]
  const session = await callbacks.session!({ token, session: { expires: '2099-01-01', user: {} } } as unknown as SessionInput) as Session
  assert.equal(session.user.preferences?.theme, 'dark')
  assert.ok(!JSON.stringify(session).includes('credentialId') && !JSON.stringify(session).includes('secret-access'))
  await credentialVault(env).remove(token.credentialId!)
  const revoked = await callbacks.jwt!({ token } as JwtInput)
  assert.deepEqual(revoked, {})
  assert.equal(accessDecision({ ...session, user: { usersauId: revoked.usersauId } }, env), 'unauthenticated')
})
