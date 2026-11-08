// A provider fixture used only by the production-server integration test process.
const original = globalThis.fetch
const origin = 'https://runtime-identity.users.test'
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input))
  if (url.origin !== origin) return original(input, init)
  const body = new URLSearchParams(String(init?.body))
  const headers = new Headers(init?.headers)
  const context = JSON.parse(body.get('context') || '{}')
  const purpose = body.get('purpose')
  const valid = init?.method === 'POST' && init?.redirect === 'error' &&
    headers.get('authorization') === `Basic ${btoa('integration-client:integration-private-fixture')}` &&
    context.links?.home_url === 'https://app.users.test/' && context.links?.logout_url === 'https://app.users.test/auth/login' &&
    ((url.pathname === '/oauth/par' && body.get('code_challenge_method') === 'S256' && /^[A-Za-z0-9_-]{43}$/.test(body.get('code_challenge') || '') && (body.get('state') || '').length >= 20) ||
     (url.pathname === '/oauth/context' && ['account', 'logout'].includes(purpose)))
  return valid ? Response.json({ request_uri: `urn:ietf:params:oauth:request_uri:${(purpose === 'logout' ? 'l' : purpose === 'account' ? 'a' : 'p').repeat(64)}`, expires_in: 300 }, { status: 201 })
    : Response.json({ error: 'invalid_request' }, { status: 400 })
}
