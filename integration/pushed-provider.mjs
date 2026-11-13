// A provider fixture used only by the production-server integration test process.
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import http from 'node:http'
import https from 'node:https'

const original = globalThis.fetch
const origin = 'https://runtime-identity.users.test'
const callback = 'https://app.users.test/auth/usersau/callback'
const credentials = `Basic ${btoa('integration-client:integration-private-fixture')}`
const accessToken = 'integration-access-token'
const refreshToken = 'integration-refresh-token'
const scope = 'profile email preferences:read preferences:write'
let authorization

const provider = http.createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/oauth/token' && request.method === 'POST') {
    let payload = ''
    for await (const chunk of request) payload += chunk
    const body = new URLSearchParams(payload)
    const challenge = createHash('sha256').update(body.get('code_verifier') || '').digest('base64url')
    if (request.headers.authorization === credentials && authorization?.challenge === challenge &&
        body.get('grant_type') === 'authorization_code' && body.get('redirect_uri') === callback &&
        body.get('code') === 'integration-code') {
      authorization = undefined
      response.end(JSON.stringify({ token_type: 'Bearer', access_token: accessToken, refresh_token: refreshToken }))
      return
    }
    response.writeHead(400).end(JSON.stringify({ error: 'invalid_grant' }))
    return
  }
  if (request.url === '/api/user' && request.headers.authorization === `Bearer ${accessToken}`) {
    response.end(JSON.stringify({ sub: '42', name: 'Integration User', email: 'user@users.test' }))
    return
  }
  response.writeHead(404).end()
})

provider.listen(0, '127.0.0.1')
await once(provider, 'listening')
provider.unref()

// openid-client uses Node HTTP rather than fetch for token exchange and UserInfo.
const originalHttpsRequest = https.request
https.request = (input, ...args) => {
  if (typeof input !== 'string' && !(input instanceof URL)) return originalHttpsRequest(input, ...args)
  const url = new URL(String(input))
  if (url.origin !== origin) return originalHttpsRequest(input, ...args)
  const { port } = provider.address()
  return http.request(`http://127.0.0.1:${port}${url.pathname}${url.search}`, ...args)
}

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input))
  if (url.origin !== origin) return original(input, init)
  const body = new URLSearchParams(String(init?.body))
  const headers = new Headers(init?.headers)
  const context = JSON.parse(body.get('context') || '{}')
  const purpose = body.get('purpose')
  const valid = init?.method === 'POST' && init?.redirect === 'error' &&
    headers.get('authorization') === credentials &&
    context.links?.home_url === 'https://app.users.test/' && context.links?.logout_url === 'https://app.users.test/auth/login' &&
    ((url.pathname === '/oauth/par' && body.get('redirect_uri') === callback && body.get('scope') === scope &&
      body.get('code_challenge_method') === 'S256' && /^[A-Za-z0-9_-]{43}$/.test(body.get('code_challenge') || '') && (body.get('state') || '').length >= 20) ||
     (url.pathname === '/oauth/context' && ['account', 'logout'].includes(purpose)))
  if (valid && url.pathname === '/oauth/par') {
    authorization = { challenge: body.get('code_challenge'), state: body.get('state') }
    return Response.json({
      request_uri: `urn:ietf:params:oauth:request_uri:${authorization.state}`, expires_in: 300,
    }, { status: 201 })
  }
  return valid ? Response.json({ request_uri: `urn:ietf:params:oauth:request_uri:${(purpose === 'logout' ? 'l' : 'a').repeat(64)}`, expires_in: 300 }, { status: 201 })
    : Response.json({ error: 'invalid_request' }, { status: 400 })
}
