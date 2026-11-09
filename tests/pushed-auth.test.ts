import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { applicationContext, applicationContextUrl, pushAuthorizationResponse } from '../src/lib/pushed-auth'
const env = {
  NODE_ENV: 'production', NEXTAUTH_URL: 'https://app.users.test',
  USERSAU_HOST: 'https://identity.users.test', NEXT_PUBLIC_USERSAU_HOST: 'https://identity.users.test',
  NEXTAUTH_SECRET: 'test-only-secret-with-more-than-32-characters', USERSAU_CLIENT_ID: 'test-client',
  USERSAU_CLIENT_SECRET: 'test-private-client-secret', USERSAU_ACCESS_MODE: 'all', NEXT_PUBLIC_APP_NAME: 'Application A',
}
const originalFetch = globalThis.fetch
const requestUri = `urn:ietf:params:oauth:request_uri:${'x'.repeat(64)}`
afterEach(() => { globalThis.fetch = originalFetch })
const authorization = () => `${env.USERSAU_HOST}/oauth/authorize?${new URLSearchParams({ client_id: env.USERSAU_CLIENT_ID,
  response_type: 'code', redirect_uri: `${env.NEXTAUTH_URL}/auth/usersau/callback`, scope: 'openid profile email',
  state: 's'.repeat(32), code_challenge: 'x'.repeat(43), code_challenge_method: 'S256' })}`

test('PAR preserves NextAuth state/PKCE cookies and pushes only server-controlled context', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), `${env.USERSAU_HOST}/oauth/par`)
    const body = new URLSearchParams(String(init!.body))
    assert.equal(body.get('state'), 's'.repeat(32)); assert.equal(body.get('code_challenge'), 'x'.repeat(43))
    assert.deepEqual(JSON.parse(body.get('context')!), applicationContext(env))
    assert.equal(init?.redirect, 'error')
    return Response.json({ request_uri: requestUri }, { status: 201 })
  }
  const response = await pushAuthorizationResponse(Response.json({ url: authorization() }, { headers: { 'set-cookie': 'state=opaque; HttpOnly; Secure' } }), env)
  assert.equal(response.headers.get('set-cookie'), 'state=opaque; HttpOnly; Secure')
  const url = new URL((await response.json()).url)
  assert.deepEqual([...url.searchParams.keys()].sort(), ['client_id', 'request_uri'])
  assert.equal(url.searchParams.get('request_uri'), requestUri)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('account and logout use fresh contexts; neither request is an OAuth authorization', async () => {
  for (const purpose of ['account', 'logout'] as const) {
    globalThis.fetch = async (_url, init) => {
      const body = new URLSearchParams(String(init!.body)); assert.equal(body.get('purpose'), purpose)
      assert.equal(body.has('state'), false); assert.equal(body.has('redirect_uri'), false)
      const context = JSON.parse(body.get('context')!); assert.equal(context.links.home_url, `${env.NEXTAUTH_URL}/`)
      assert.equal(context.links.logout_url, `${env.NEXTAUTH_URL}/auth/login`)
      return Response.json({ request_uri: requestUri }, { status: 201 })
    }
    assert.equal(new URL(await applicationContextUrl(env, purpose)).pathname, `/${purpose}`)
  }
})

test('redirect responses retain cookies; callback substitution and missing PKCE are rejected before network access', async () => {
  let requests = 0
  globalThis.fetch = async () => { requests++; return Response.json({ request_uri: requestUri }, { status: 201 }) }
  const response = await pushAuthorizationResponse(new Response(null, { status: 302, headers: { location: authorization(), 'set-cookie': 'pkce=opaque; HttpOnly' } }), env)
  assert.equal(response.status, 302); assert.equal(response.headers.get('set-cookie'), 'pkce=opaque; HttpOnly')
  assert.equal(new URL(response.headers.get('location')!).searchParams.get('request_uri'), requestUri)
  for (const field of ['redirect_uri', 'code_challenge', 'code_challenge_method', 'client_id']) {
    const url = new URL(authorization()); url.searchParams.set(field, 'invalid')
    await assert.rejects(() => pushAuthorizationResponse(Response.json({ url: url.toString() }), env))
  }
  assert.equal(requests, 1)
})

test('provider rejection never returns the original direct authorization URL', async () => {
  globalThis.fetch = async () => Response.json({ error: 'private-server-detail' }, { status: 401 })
  await assert.rejects(() => pushAuthorizationResponse(Response.json({ url: authorization() }), env), /Users.au rejected the pushed request/)
})
