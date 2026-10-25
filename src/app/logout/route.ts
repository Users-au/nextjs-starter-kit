import { NextRequest } from "next/server"
import { authEnvironment } from "@/lib/auth-config"
import { runAuthAction } from "@/lib/auth-handler"

export async function GET(request: NextRequest) {
  // A GET displays confirmation; only a CSRF-verified POST changes the session.
  const csrf: Response = await runAuthAction(request, ["csrf"])
  const data: unknown = await csrf.json()
  if (!data || typeof data !== "object" || !("csrfToken" in data) || typeof data.csrfToken !== "string" || !/^[a-zA-Z0-9._-]+$/.test(data.csrfToken)) {
    return new Response("Sign-out is temporarily unavailable", { status: 503 })
  }
  const headers = new Headers(csrf.headers)
  headers.set("content-type", "text/html; charset=utf-8")
  headers.set("cache-control", "no-store")
  headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign out</title><style>body{margin:0;background:#f9fafb;color:#111827;font:16px system-ui,sans-serif;display:grid;min-height:100dvh;place-items:center}main{max-width:24rem;margin:1.5rem;padding:2rem;background:white;border-radius:.75rem;box-shadow:0 1px 4px #0002}h1{font-size:1.5rem}button{background:#4f46e5;color:white;border:0;border-radius:.375rem;padding:.75rem 1rem;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #818cf8;outline-offset:3px}</style></head><body><main><h1>Sign out</h1><p>Sign out of this application and your Users.au session?</p><form action="/logout" method="post"><input type="hidden" name="csrfToken" value="${data.csrfToken}"><button type="submit">Sign out</button></form></main></body></html>`, { headers })
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
  const url = `${identityOrigin}/logout`
  if (request.headers.get("accept")?.includes("application/json")) return Response.json({ url }, { headers })
  headers.delete("content-type")
  headers.set("location", url)
  return new Response(null, { status: 303, headers })
}
