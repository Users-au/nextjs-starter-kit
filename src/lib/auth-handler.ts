import "server-only"
import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { getAuthOptions } from "./auth"
import { pushAuthorizationResponse } from "./pushed-auth"

export async function runAuthAction(request: NextRequest, action: string[]) {
  const response: Response = await NextAuth(getAuthOptions())(request, { params: Promise.resolve({ nextauth: action }) })
  if (action[0] !== 'signin') return response
  try { return await pushAuthorizationResponse(response, process.env) }
  catch { return Response.json({ error: 'Sign-in is temporarily unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } }) }
}
