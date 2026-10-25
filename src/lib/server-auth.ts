import "server-only"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { getAuthOptions } from "./auth"
import { accessDecision } from "./auth-policy"

export class AccessError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Access denied")
  }
}

// Call before private data access. Consumers add their resource/role policy here.
export async function getAuthorizedSession() {
  const session = await getServerSession(getAuthOptions())
  const decision = accessDecision(session, process.env)
  if (decision !== "allowed") throw new AccessError(decision === "unauthenticated" ? 401 : 403)
  return session!
}

export async function requireUser(callbackUrl = "/dashboard") {
  try {
    return await getAuthorizedSession()
  } catch (error) {
    if (!(error instanceof AccessError)) throw error
    if (error.status === 403) redirect("/auth/access-denied")
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }
}
