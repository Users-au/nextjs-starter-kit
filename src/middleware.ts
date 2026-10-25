import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { identityAllowed } from "./lib/auth-policy"

export default withAuth(request => {
  if (!identityAllowed(request.nextauth.token?.usersauId, process.env)) {
    return NextResponse.redirect(new URL("/auth/access-denied", request.url))
  }
  return NextResponse.next()
}, {
  pages: { signIn: "/auth/login" },
  callbacks: { authorized: ({ token }) => typeof token?.usersauId === "string" && token.usersauId.length > 0 },
})

// Navigation optimization only. Dashboard layout/data and APIs independently check access.
export const config = { matcher: ["/dashboard/:path*"] }
