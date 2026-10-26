import "server-only"
import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { getAuthOptions } from "./auth"

export function runAuthAction(request: NextRequest, action: string[]) {
  return NextAuth(getAuthOptions())(request, { params: Promise.resolve({ nextauth: action }) })
}
