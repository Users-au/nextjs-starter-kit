import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { SignInButton } from "@/components/SignInButton"
import { getAuthOptions } from "@/lib/auth"
import { authConfigIssues } from "@/lib/auth-config"
import { accessDecision } from "@/lib/auth-policy"
import { safeCallbackUrl } from "@/lib/auth-urls"

const errors: Record<string, string> = {
  Callback: "Sign-in could not be completed. Check the registered callback and supported Users.au scopes, then retry.",
  OAuthCallback: "The identity provider returned an invalid callback. Please retry or contact the app operator.",
  OAuthSignin: "Could not start sign-in. Check the authentication configuration.",
  AccessDenied: "This account is not allowed to access this application.",
  Configuration: "Authentication is not configured correctly. Contact the app operator.",
  SessionRequired: "Please sign in to continue.",
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams
  const issues = authConfigIssues(process.env)
  const callbackUrl = safeCallbackUrl(params.callbackUrl, process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  if (!issues.length) {
    const session = await getServerSession(getAuthOptions())
    const decision = accessDecision(session, process.env)
    if (decision === "allowed") redirect(callbackUrl)
    if (decision === "forbidden") redirect("/auth/access-denied")
  }
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-semibold">Sign in to {process.env.NEXT_PUBLIC_APP_NAME || "your application"}</h1>
      <p className="my-5 text-sm text-gray-600">Continue with your Users.au account.</p>
      {params.error && <p role="alert" className="mb-5 rounded bg-red-50 p-3 text-sm text-red-800">{errors[params.error] ?? "Sign-in failed. Please retry or contact the app operator."}</p>}
      {issues.length > 0 && <p role="alert" className="mb-5 rounded bg-amber-50 p-3 text-sm text-amber-900">Invalid authentication configuration: {issues.join(", ")}. Contact the app operator.</p>}
      <SignInButton callbackUrl={callbackUrl} disabled={issues.length > 0} />
    </div>
  </main>
}
