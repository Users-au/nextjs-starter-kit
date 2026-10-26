import { NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { authEnvironment } from "@/lib/auth-config"
import { runAuthAction } from "@/lib/auth-handler"

function logoutReturnCookie(appOrigin: string, maxAge: number) {
  const secure = new URL(appOrigin).protocol === "https:"
  const name = `${secure ? "__Host-" : ""}usersau.logout-return`
  return { name, header: `${name}=${maxAge ? "1" : ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}` }
}

export async function GET(request: NextRequest) {
  // Automatic navigation must not turn a cross-site link/embed into logout CSRF.
  const { appOrigin, identityOrigin } = authEnvironment(process.env)
  const marker = logoutReturnCookie(appOrigin, 0)
  const hasLocalSession = request.cookies.getAll().some(({ name }) => /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name))
  if (request.cookies.get(marker.name)?.value === "1" && !hasLocalSession) {
    // Some provider configurations return to the registered /logout instead of
    // accepting `continue`. Consume only a completed local logout, avoiding loops.
    return new Response(null, { status: 303, headers: { location: `${appOrigin}/auth/login`, "cache-control": "no-store", "set-cookie": marker.header } })
  }
  const site = request.headers.get("sec-fetch-site")
  let sameOrigin = false
  try {
    sameOrigin = new URL(request.headers.get("origin") || request.headers.get("referer") || "").origin === appOrigin
  } catch { /* An absent or invalid initiator does not establish same-origin. */ }
  // `none` is browser-controlled for address-bar/bookmark navigation; mode/dest
  // need not survive hosting proxies for this trusted initiation to remain valid.
  const directNavigation = site === "none"
  if (!(site === "same-origin" || directNavigation || (!site && sameOrigin))) {
    const loggedSite = ["same-site", "cross-site"].includes(site ?? "") ? site : "missing-or-invalid"
    console.warn(`[auth] LOGOUT_NAVIGATION_REJECTED site=${loggedSite} sameOrigin=${sameOrigin}`)
    return new Response("Open sign-out from this application", { status: 403, headers: { "cache-control": "no-store" } })
  }
  // GET only prepares the CSRF pair; the automatic POST clears the session.
  const csrf: Response = await runAuthAction(request, ["csrf"])
  const data: unknown = await csrf.json()
  if (!data || typeof data !== "object" || !("csrfToken" in data) || typeof data.csrfToken !== "string" || !/^[a-zA-Z0-9._-]+$/.test(data.csrfToken)) {
    return new Response("Sign-out is temporarily unavailable", { status: 503 })
  }
  const headers = new Headers(csrf.headers)
  headers.set("content-type", "text/html; charset=utf-8")
  headers.set("cache-control", "no-store")
  const script = "document.getElementById('logout-form').requestSubmit()"
  const hash = createHash("sha256").update(script).digest("base64")
  headers.set("content-security-policy", `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; form-action 'self' ${identityOrigin}; base-uri 'none'; frame-ancestors 'none'`)
  headers.set("referrer-policy", "no-referrer")
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signing out</title><style>body{margin:0;background:#f9fafb;color:#111827;font:16px system-ui,sans-serif;display:grid;min-height:100dvh;place-items:center}main{margin:1.5rem;padding:2rem}h1{font-size:1.5rem}</style></head><body><main><h1>Signing out…</h1><form id="logout-form" action="/logout" method="post"><input type="hidden" name="csrfToken" value="${data.csrfToken}"></form><noscript>Enable JavaScript to complete sign-out automatically.</noscript></main><script>${script}</script></body></html>`, { headers })
}

export async function POST(request: NextRequest) {
  let csrfToken: FormDataEntryValue | null
  try { csrfToken = (await request.formData()).get("csrfToken") } catch {
    return Response.json({ error: "Invalid sign-out request" }, { status: 400 })
  }
  if (typeof csrfToken !== "string" || !csrfToken) return Response.json({ error: "Invalid sign-out request" }, { status: 403 })
  const { appOrigin, identityOrigin } = authEnvironment(process.env)
  const callbackUrl = `${appOrigin}/dashboard`
  const internal = new NextRequest(`${appOrigin}/api/auth/signout`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl, json: "true" }),
  })
  // NextAuth reads the original request's cookie context and verifies the CSRF pair.
  const result: Response = await runAuthAction(internal, ["signout"])
  const data: unknown = await result.json()
  if (!data || typeof data !== "object" || !("url" in data) || data.url !== callbackUrl) {
    return Response.json({ error: "Invalid sign-out request" }, { status: 403 })
  }
  const headers = new Headers(result.headers)
  headers.delete("location")
  headers.set("cache-control", "no-store")
  headers.append("set-cookie", logoutReturnCookie(appOrigin, 120).header)
  // Users.au's official clients use `continue` for the post-logout destination.
  // Derive it from trusted config; request parameters cannot choose another host.
  const remoteLogout = new URL("/logout", identityOrigin)
  remoteLogout.searchParams.set("continue", `${appOrigin}/auth/login`)
  const url = remoteLogout.toString()
  if (request.headers.get("accept")?.includes("application/json")) return Response.json({ url }, { headers })
  headers.delete("content-type")
  headers.set("location", url)
  return new Response(null, { status: 303, headers })
}
