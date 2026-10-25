import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { getAuthOptions } from "@/lib/auth"

async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return NextAuth(getAuthOptions())(request, context)
}

export { handler as GET, handler as POST }
