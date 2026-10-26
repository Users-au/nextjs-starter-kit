import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import type { AuthOptions, Session } from "next-auth"
import type { OAuthConfig, TokenEndpointHandler } from "next-auth/providers/oauth"
import { authConfigIssues, authEnvironment } from "../src/lib/auth-config"
import { accessDecision, identityAllowed, normalizeProfile } from "../src/lib/auth-policy"
import { matchesRoute, safeCallbackUrl } from "../src/lib/auth-urls"
import { createAuthOptions } from "../src/lib/auth"
import { setupEnvironment } from "../scripts/setup-env.mjs"
import { supportedRuntime, checkRuntime, checkServerRuntime } from "../scripts/check-runtime.mjs"
import { authPaths } from "../src/lib/auth-paths"

const env = {
  NODE_ENV: "production", NEXTAUTH_URL: "https://app.users.test",
  USERSAU_HOST: "https://identity.users.test", NEXT_PUBLIC_USERSAU_HOST: "https://identity.users.test",
  NEXTAUTH_SECRET: "test-only-secret-with-more-than-32-characters", USERSAU_CLIENT_ID: "test-client",
  USERSAU_CLIENT_SECRET: "test-private-client-secret", USERSAU_ACCESS_MODE: "allowlist", USERSAU_ALLOWED_USER_IDS: "42, 100",
}
const session = (id: string): Session => ({ expires: "2099-01-01T00:00:00Z", user: { usersauId: id } })

test("runtime policy rejects releases before the October security fixes", () => {
  for (const version of ["20.20.0", "22.23.3", "24.14.1", "24.22.0", "24.22.1-rc.1", "25.0.0"]) assert.equal(supportedRuntime(version), false)
  for (const version of ["22.23.4", "22.24.0", "24.22.1", "24.23.0"]) assert.equal(supportedRuntime(version), true)
})

test("managed runtime exception is explicit, provider-scoped and never permits unsupported majors", () => {
  const warnings: string[] = []
  const warn = (message: string) => { warnings.push(message) }
  assert.throws(() => checkRuntime("24.21.0"), /24\.21\.0/)
  assert.throws(() => checkServerRuntime("24.21.0", { VERCEL: "1" }, warn))
  assert.throws(() => checkServerRuntime("24.21.0", { USERSAU_ALLOW_MANAGED_PATCH_LAG: "true" }, warn))
  assert.throws(() => checkServerRuntime("20.20.0", { VERCEL: "1", USERSAU_ALLOW_MANAGED_PATCH_LAG: "true" }, warn))
  checkServerRuntime("24.21.0", { VERCEL: "1", USERSAU_ALLOW_MANAGED_PATCH_LAG: "true" }, warn)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /24\.21\.0/)
  assert.match(warnings[0], /not a replacement/)
  checkServerRuntime("24.22.1", {}, warn)
  assert.equal(warnings.length, 1)
})

test("strict config rejects missing/placeholder values, mismatched hosts and unsafe production origins", () => {
  assert.deepEqual(authConfigIssues(env), [])
  for (const key of ["NEXTAUTH_URL", "NEXTAUTH_SECRET", "USERSAU_HOST", "NEXT_PUBLIC_USERSAU_HOST", "USERSAU_CLIENT_ID", "USERSAU_CLIENT_SECRET", "USERSAU_ACCESS_MODE"]) {
    assert.ok(authConfigIssues({ ...env, [key]: undefined }).includes(key))
  }
  for (const value of ["http://localhost:3000", "http://app.users.test", "https://app.users.test/path", "https://user:password@app.users.test", "https://app.users.test?query=1", "https://your-subdomain.users.au"]) {
    assert.ok(authConfigIssues({ ...env, NEXTAUTH_URL: value }).includes("NEXTAUTH_URL"))
  }
  assert.ok(authConfigIssues({ ...env, NEXT_PUBLIC_USERSAU_HOST: "https://other.users.test" }).includes("NEXT_PUBLIC_USERSAU_HOST"))
  assert.ok(authConfigIssues({ ...env, USERSAU_ALLOWED_USER_IDS: " , " }).includes("USERSAU_ALLOWED_USER_IDS"))
  assert.ok(authConfigIssues({ ...env, USERSAU_CLIENT_SECRET: "your_client_secret_here" }).includes("USERSAU_CLIENT_SECRET"))
  const privateValue = "DO-NOT-LOG-THIS"
  assert.throws(() => authEnvironment({ ...env, NEXTAUTH_SECRET: privateValue }), error => error instanceof Error && !error.message.includes(privateValue))
})

test("development permits loopback HTTP; origins normalize and scope stays explicitly undefined", () => {
  assert.deepEqual(authConfigIssues({ ...env, NODE_ENV: "development", NEXTAUTH_URL: "http://localhost:3000" }), [])
  const options = createAuthOptions({ ...env, USERSAU_SCOPE: "  " })
  const provider = options.providers[0]
  assert.equal(provider.id, "usersau")
  assert.ok("authorization" in provider)
  const authorization = provider.authorization as { url: string; params: Record<string, unknown> }
  assert.equal(Object.hasOwn(authorization.params, "scope"), true)
  assert.equal(authorization.params.scope, undefined)
  assert.equal(authEnvironment({ ...env, USERSAU_SCOPE: " profile email " }).scope, "profile email")
  assert.equal(authEnvironment({ ...env, USERSAU_HOST: `${env.USERSAU_HOST}/` }).identityOrigin, env.USERSAU_HOST)
})

test("configured branded domains are accepted without weakening origin or template validation", () => {
  for (const identityOrigin of ["https://your-brand.users.au", "https://your-company.auth.test", "https://replace-legacy.auth.test"]) {
    const branded = { ...env, USERSAU_HOST: identityOrigin, NEXT_PUBLIC_USERSAU_HOST: identityOrigin }
    assert.deepEqual(authConfigIssues(branded), [])
    assert.equal(authEnvironment(branded).identityOrigin, identityOrigin)
  }
  assert.deepEqual(authConfigIssues({ ...env, NEXTAUTH_URL: "https://your-app.product.test" }), [])
  for (const identityOrigin of ["https://example.com", "https://auth.example.net", "https://auth.example.org.", "https://identity.example", "https://your-subdomain.users.au", "https://your-domain.users.au"]) {
    const invalid = { ...env, USERSAU_HOST: identityOrigin, NEXT_PUBLIC_USERSAU_HOST: identityOrigin }
    assert.ok(authConfigIssues(invalid).includes("USERSAU_HOST"))
    assert.ok(authConfigIssues(invalid).includes("NEXT_PUBLIC_USERSAU_HOST"))
  }
})

test("public OAuth endpoints use one canonical callback for authorization and verified token exchange", async () => {
  const provider = createAuthOptions(env).providers[0] as OAuthConfig<Record<string, unknown>>
  const callback = `${env.NEXTAUTH_URL}${authPaths.callback}`
  assert.deepEqual(authPaths, { redirect: "/auth/usersau/redirect", callback: "/auth/usersau/callback", logout: "/logout" })
  assert.equal((provider.authorization as { params: { redirect_uri: string } }).params.redirect_uri, callback)
  assert.deepEqual(provider.client?.redirect_uris, [callback])
  const endpoint = provider.token as TokenEndpointHandler
  assert.ok(endpoint.request)
  type Input = Parameters<NonNullable<TokenEndpointHandler["request"]>>[0]
  const params = { code: "test-code", state: "expected-state" }
  const checks = { state: "expected-state", code_verifier: "test-verifier" }
  const tokens = { access_token: "transient-provider-token" }
  let observed: unknown[] = []
  const input = { params, checks, client: { oauthCallback: async (...args: unknown[]) => { observed = args; return tokens } } } as unknown as Input
  const response = await endpoint.request(input)
  assert.deepEqual(observed, [callback, params, checks])
  assert.equal(response.tokens, tokens)
  const rejected = { ...input, client: { oauthCallback: async () => { throw new Error("state mismatch") } } } as unknown as Input
  await assert.rejects(async () => endpoint.request!(rejected), /state mismatch/)
})

test("return URLs retain local path/query while rejecting external and encoded redirect tricks and loops", () => {
  const base = env.NEXTAUTH_URL
  assert.equal(safeCallbackUrl("/dashboard/settings?tab=profile#heading", base), "/dashboard/settings?tab=profile#heading")
  assert.equal(safeCallbackUrl(`${base}/dashboard?x=1`, base), "/dashboard?x=1")
  for (const value of [undefined, "https://evil.test/x", "//evil.test/x", "javascript:alert(1)", "https://app.users.test.evil.test/", "https://user@app.users.test/x", "/\\evil.test", "/%2f%2fevil.test", "/%5cevil.test", "/%252fevil.test", "/%0d%0aLocation:evil", "/%", "/auth/login", "/auth/access-denied", "/api/auth/signin", "/logout", "/logout/", "/", "http://localhost:3000/dashboard"]) {
    assert.equal(safeCallbackUrl(value, base), "/dashboard", String(value))
  }
  assert.equal(matchesRoute("/dashboard/settings", "/dashboard"), true)
  assert.equal(matchesRoute("/dashboard-other", "/dashboard"), false)
})

test("identity normalization validates IDs and applies usable image fallbacks", () => {
  assert.equal(normalizeProfile({ id: 42 }).usersauId, "42")
  assert.equal(normalizeProfile({ id: "abc", avatar: "", image: "https://image.users.test/me.png" }).image, "https://image.users.test/me.png")
  assert.equal(normalizeProfile({ id: "abc", avatar: "javascript:alert(1)", picture: "https://image.users.test/me.png" }).image, "https://image.users.test/me.png")
  assert.equal(normalizeProfile({ id: "abc" }).image, null)
  for (const id of [undefined, null, {}, "", " ", "bad\nvalue", -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => normalizeProfile({ id }))
  }
})

test("access policy denies missing/unknown identities and rechecks existing sessions against current membership", () => {
  assert.equal(accessDecision(null, env), "unauthenticated")
  assert.equal(accessDecision({ expires: "", user: {} }, env), "unauthenticated")
  assert.equal(accessDecision(session("42"), env), "allowed")
  assert.equal(accessDecision(session("43"), env), "forbidden")
  assert.equal(accessDecision(session("42"), { ...env, USERSAU_ALLOWED_USER_IDS: "100" }), "forbidden")
  assert.equal(identityAllowed("42", {}), false)
  assert.equal(identityAllowed("42", { USERSAU_ACCESS_MODE: "all" }), true)
  assert.equal(identityAllowed(undefined, { USERSAU_ACCESS_MODE: "all" }), false)
})

test("callbacks strip legacy OAuth tokens and project minimal browser session data", async () => {
  const callbacks = createAuthOptions(env).callbacks!
  type JwtInput = Parameters<NonNullable<NonNullable<AuthOptions["callbacks"]>["jwt"]>>[0]
  const token = await callbacks.jwt!({ token: { sub: "42", usersauId: "42", accessToken: "private-access", refreshToken: "private-refresh", extra: "secret" } } as unknown as JwtInput)
  assert.ok(!("accessToken" in token) && !("refreshToken" in token) && !("extra" in token))
  type SessionInput = Parameters<NonNullable<NonNullable<AuthOptions["callbacks"]>["session"]>>[0]
  const result = await callbacks.session!({ session: { ...session("42"), accessToken: "legacy-secret" }, token } as unknown as SessionInput)
  assert.deepEqual(Object.keys(result).sort(), ["expires", "user"])
  assert.equal((result as Session).user.usersauId, "42")
  assert.ok(!JSON.stringify(result).includes("private-") && !JSON.stringify(result).includes("legacy-secret"))
  assert.equal(await callbacks.redirect!({ url: "https://evil.test", baseUrl: env.NEXTAUTH_URL }), `${env.NEXTAUTH_URL}/dashboard`)
  type SignInInput = Parameters<NonNullable<NonNullable<AuthOptions["callbacks"]>["signIn"]>>[0]
  assert.equal(await callbacks.signIn!({ user: { id: "43", usersauId: "43" } } as SignInInput), false)
  assert.equal(await callbacks.signIn!({ user: { id: "42", usersauId: "42" } } as SignInInput), true)
})

test("setup uses env.example, handles arbitrary secret characters and never overwrites an existing env", () => {
  const directory = mkdtempSync(join(tmpdir(), "usersau-setup-test-"))
  try {
    writeFileSync(join(directory, "env.example"), "NEXTAUTH_SECRET=your-secret-key-here\nUSERSAU_SCOPE=\n")
    const secret = "a/b+c&d$e=with-special-characters"
    assert.equal(setupEnvironment(directory, () => secret), "created")
    assert.equal(readFileSync(join(directory, ".env.local"), "utf8"), `NEXTAUTH_SECRET=${secret}\nUSERSAU_SCOPE=\n`)
    if (process.platform !== "win32") assert.equal(statSync(join(directory, ".env.local")).mode & 0o777, 0o600)
    assert.equal(setupEnvironment(directory, () => "new-secret"), "preserved")
    assert.ok(readFileSync(join(directory, ".env.local"), "utf8").includes(secret))
  } finally { rmSync(directory, { recursive: true }) }
})

test("build checker loads app-root Next.js env files and never prints configuration values", () => {
  const directory = mkdtempSync(join(tmpdir(), "usersau-config-test-"))
  try {
    const fixture = Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n")
    writeFileSync(join(directory, ".env.local"), `${fixture}\n`)
    const loader = createRequire(resolve("package.json")).resolve("tsx")
    const run = () => spawnSync(process.execPath, ["--import", loader, resolve("scripts/build-check.ts")], {
      cwd: directory,
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
      encoding: "utf8",
    })
    const valid = run()
    assert.equal(valid.status, 0, valid.stderr)
    assert.ok(!valid.stdout.includes(env.NEXTAUTH_SECRET) && !valid.stdout.includes(env.USERSAU_CLIENT_SECRET))
    writeFileSync(join(directory, ".env.local"), fixture.replace(env.NEXTAUTH_SECRET, "private-invalid-secret"))
    const invalid = run()
    assert.equal(invalid.status, 1)
    assert.ok(invalid.stderr.includes("NEXTAUTH_SECRET"))
    assert.ok(!invalid.stderr.includes("private-invalid-secret"))
  } finally { rmSync(directory, { recursive: true }) }
})
