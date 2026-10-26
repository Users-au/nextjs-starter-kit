import assert from "node:assert/strict"
import { test } from "node:test"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { resolve } from "node:path"
import { encode } from "next-auth/jwt"
import { createHash } from "node:crypto"
import { request as nodeRequest } from "node:http"

test("production server protects data independently of middleware and returns minimal sessions", { timeout: 120_000 }, async () => {
  const listener = createServer()
  listener.listen(0, "127.0.0.1")
  await once(listener, "listening")
  const address = listener.address()
  assert.ok(address && typeof address === "object")
  const port = address.port
  await new Promise<void>((done, reject) => listener.close(error => error ? reject(error) : done()))
  const env = {
    ...process.env,
    NODE_ENV: "production" as const, NEXTAUTH_URL: "https://app.users.test",
    NEXTAUTH_SECRET: "integration-only-nonsecret-secret-with-32-plus-characters",
    USERSAU_HOST: "https://runtime-identity.users.test", NEXT_PUBLIC_USERSAU_HOST: "https://runtime-identity.users.test",
    USERSAU_CLIENT_ID: "integration-client", USERSAU_CLIENT_SECRET: "integration-private-fixture",
    USERSAU_ACCESS_MODE: "allowlist", USERSAU_ALLOWED_USER_IDS: "42", USERSAU_SCOPE: "",
    NEXT_TELEMETRY_DISABLED: "1",
  }
  const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] })
  let output = ""
  child.stdout.on("data", chunk => { output += String(chunk) })
  child.stderr.on("data", chunk => { output += String(chunk) })
  const request = (path: string, init: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, { ...init, redirect: "manual" })
  try {
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await request("/api/auth/providers")).status === 200 } catch { /* starting */ }
      if (ready) break
      if (child.exitCode !== null) throw new Error(`Server exited during startup: ${output}`)
      await new Promise(done => setTimeout(done, 200))
    }
    assert.ok(ready, `Server did not start: ${output}`)
    assert.equal((await request("/api/profile")).status, 401)
    const anonymousPage = await request("/dashboard")
    assert.ok([302, 307].includes(anonymousPage.status))
    assert.ok(anonymousPage.headers.get("location")?.includes("/auth/login"))
    const cookieName = "__Secure-next-auth.session-token"
    const jwt = await encode({ secret: env.NEXTAUTH_SECRET, token: { sub: "42", usersauId: "42", name: "Integration User", email: "user@users.test", accessToken: "MUST-NOT-LEAK-ACCESS", refreshToken: "MUST-NOT-LEAK-REFRESH" } })
    const headers = { cookie: `${cookieName}=${jwt}` }
    const profile = await request("/api/profile", { headers })
    assert.equal(profile.status, 200)
    assert.match(profile.headers.get("cache-control")!, /no-store/)
    const data = await profile.json()
    assert.equal(data.user.usersauId, "42")
    assert.ok(!JSON.stringify(data).includes("MUST-NOT-LEAK"))
    const session = await request("/api/auth/session", { headers })
    assert.equal(session.status, 200)
    const sessionData = await session.json()
    assert.deepEqual(Object.keys(sessionData).sort(), ["expires", "user"])
    assert.ok(!JSON.stringify(sessionData).includes("MUST-NOT-LEAK"))
    const dashboard = await request("/dashboard", { headers })
    assert.equal(dashboard.status, 200)
    assert.ok((await dashboard.text()).includes(`${env.USERSAU_HOST}/account`))
    const deniedScreen = await request("/auth/access-denied")
    assert.equal(deniedScreen.status, 200)
    assert.ok((await deniedScreen.text()).includes(`${env.USERSAU_HOST}/account`))
    const disallowedJwt = await encode({ secret: env.NEXTAUTH_SECRET, token: { sub: "43", usersauId: "43" } })
    const forbidden = await request("/api/profile", { headers: { cookie: `${cookieName}=${disallowedJwt}` } })
    assert.equal(forbidden.status, 403)
    const disallowedPage = await request("/dashboard", { headers: { cookie: `${cookieName}=${disallowedJwt}` } })
    assert.ok(disallowedPage.headers.get("location")?.includes("/auth/access-denied"))
    const expired = await encode({ secret: env.NEXTAUTH_SECRET, token: { sub: "42", usersauId: "42" }, maxAge: -60 })
    assert.equal((await request("/api/profile", { headers: { cookie: `${cookieName}=${expired}` } })).status, 401)
    assert.equal((await request("/api/profile", { headers: { cookie: `${cookieName}=tampered` } })).status, 401)
    const spoofedMiddleware = await request("/api/profile", { headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" } })
    assert.equal(spoofedMiddleware.status, 401)
    const publicRedirect = await request("/auth/usersau/redirect?callbackUrl=/dashboard")
    assert.equal(publicRedirect.status, 200)
    assert.match(await publicRedirect.text(), /Redirecting to Users.au/)
    const invalidCallback = await request("/auth/usersau/callback?code=invalid&state=forged")
    assert.ok([302, 303, 307].includes(invalidCallback.status))
    const callbackError = new URL(invalidCallback.headers.get("location")!)
    assert.equal(callbackError.pathname, "/api/auth/error")
    assert.equal(callbackError.searchParams.get("error"), "OAuthCallback")
    const errorScreen = await request(`${callbackError.pathname}${callbackError.search}`)
    const signInError = new URL(errorScreen.headers.get("location")!)
    assert.equal(signInError.pathname, "/api/auth/signin")
    const loginScreen = await request(`${signInError.pathname}${signInError.search}`)
    assert.ok(loginScreen.headers.get("location")?.includes("/auth/login"))
    assert.ok(!invalidCallback.headers.getSetCookie().some(cookie => cookie.startsWith(`${cookieName}=`) && !cookie.includes("Max-Age=0")))

    const logoutStart = await request("/logout", { headers: { ...headers, "sec-fetch-site": "same-origin" } })
    assert.equal(logoutStart.status, 200)
    const logoutHtml = await logoutStart.text()
    assert.match(logoutHtml, /form id="logout-form" action="\/logout" method="post"/)
    assert.doesNotMatch(logoutHtml, /<button|Sign out of this application and your Users.au session\?/)
    const autoSubmit = /<script>([^<]+)<\/script>/.exec(logoutHtml)?.[1]
    assert.ok(autoSubmit)
    assert.match(autoSubmit, /\.requestSubmit\(\)/)
    const hash = createHash("sha256").update(autoSubmit).digest("base64")
    assert.ok(logoutStart.headers.get("content-security-policy")?.includes(`script-src 'sha256-${hash}'`))
    assert.ok(logoutStart.headers.get("content-security-policy")?.includes(`form-action 'self' ${env.USERSAU_HOST}`))
    assert.ok(!logoutStart.headers.getSetCookie().some(cookie => cookie.startsWith(`${cookieName}=`)))
    for (const site of ["cross-site", "same-site"]) {
      assert.equal((await request("/logout", { headers: { ...headers, "sec-fetch-site": site, "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" } })).status, 403)
    }
    assert.equal((await request("/logout", { headers })).status, 403)
    // fetch() overwrites Sec-Fetch-Mode with "cors"; use raw HTTP for navigation metadata.
    const directStatus = await new Promise<number>((done, reject) => {
      const outgoing = nodeRequest({ hostname: "127.0.0.1", port, path: "/logout", headers: { ...headers, "sec-fetch-site": "none", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" } }, response => {
        response.resume()
        done(response.statusCode ?? 0)
      })
      outgoing.on("error", reject)
      outgoing.end()
    })
    assert.equal(directStatus, 200)
    assert.equal((await request("/logout", { headers: { ...headers, "sec-fetch-site": "none" } })).status, 200)
    assert.equal((await request("/logout", { headers: { ...headers, referer: `${env.NEXTAUTH_URL}/dashboard` } })).status, 200)
    assert.equal((await request("/logout", { method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" }, body: "" })).status, 403)
    assert.equal((await request("/logout", { method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" }, body: "csrfToken=forged" })).status, 403)
    assert.equal((await request("/api/profile", { headers })).status, 200)

    // Inspect a real NextAuth-generated OAuth request; this does not contact Users.au.
    const csrfResponse = await request("/api/auth/csrf")
    const { csrfToken } = await csrfResponse.json()
    const csrfCookies = csrfResponse.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ")
    const signIn = await request("/api/auth/signin/usersau", {
      method: "POST", headers: { cookie: csrfCookies, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/dashboard?tab=profile", json: "true" }),
    })
    assert.equal(signIn.status, 200)
    const authorization = new URL((await signIn.json()).url)
    assert.equal(authorization.origin, env.USERSAU_HOST)
    assert.equal(authorization.pathname, "/oauth/authorize")
    assert.equal(authorization.searchParams.get("redirect_uri"), `${env.NEXTAUTH_URL}/auth/usersau/callback`)
    assert.equal(authorization.searchParams.get("response_type"), "code")
    assert.ok(authorization.searchParams.get("state"))
    assert.ok(!authorization.searchParams.get("scope"))
    const signOut = await request("/logout", {
      method: "POST", headers: { cookie: `${csrfCookies}; ${cookieName}=${jwt}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ csrfToken }),
    })
    assert.equal(signOut.status, 200)
    const expectedLogout = new URL("/logout", env.USERSAU_HOST)
    expectedLogout.searchParams.set("continue", `${env.NEXTAUTH_URL}/auth/login`)
    assert.deepEqual(await signOut.json(), { url: expectedLogout.toString() })
    assert.ok(signOut.headers.getSetCookie().some(cookie => cookie.startsWith(`${cookieName}=`) && cookie.includes("Max-Age=0")))
    const returnMarker = signOut.headers.getSetCookie().find(cookie => cookie.startsWith("__Host-usersau.logout-return="))
    assert.ok(returnMarker)
    assert.ok(returnMarker.includes("HttpOnly") && returnMarker.includes("Secure") && returnMarker.includes("SameSite=Lax") && returnMarker.includes("Max-Age=120"))
    const completedLogout = await request("/logout", { headers: { cookie: returnMarker.split(";")[0], "sec-fetch-site": "cross-site" } })
    assert.equal(completedLogout.status, 303)
    assert.equal(completedLogout.headers.get("location"), `${env.NEXTAUTH_URL}/auth/login`)
    assert.ok(completedLogout.headers.getSetCookie().some(cookie => cookie.startsWith("__Host-usersau.logout-return=") && cookie.includes("Max-Age=0")))
    assert.equal((await request("/logout", { headers: { cookie: `${returnMarker.split(";")[0]}; ${cookieName}=${jwt}`, "sec-fetch-site": "cross-site" } })).status, 403)
    const nativeCsrf = /name="csrfToken" value="([a-zA-Z0-9._-]+)"/.exec(logoutHtml)?.[1]
    assert.ok(nativeCsrf)
    const nativeCookies = logoutStart.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ")
    const nativeSignOut = await request("/logout", {
      method: "POST", headers: { cookie: `${nativeCookies}; ${cookieName}=${jwt}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: nativeCsrf, continue: "https://evil.test/", callbackUrl: "https://evil.test/" }),
    })
    assert.equal(nativeSignOut.status, 303)
    assert.equal(nativeSignOut.headers.get("location"), expectedLogout.toString())
    assert.ok(nativeSignOut.headers.getSetCookie().some(cookie => cookie.startsWith(`${cookieName}=`) && cookie.includes("Max-Age=0")))
  } finally {
    child.kill("SIGTERM")
    await Promise.race([once(child, "exit"), new Promise(done => setTimeout(done, 5000))])
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
  }
})
