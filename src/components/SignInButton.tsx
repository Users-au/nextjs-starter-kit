"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authPaths } from "@/lib/auth-paths"

export function SignInButton({ callbackUrl, disabled }: { callbackUrl: string; disabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  return <>
    <button type="button" disabled={disabled || loading} className="w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white disabled:opacity-50" onClick={async () => {
      setLoading(true)
      setFailed(false)
      try { router.push(`${authPaths.redirect}?callbackUrl=${encodeURIComponent(callbackUrl)}`) } catch { setFailed(true) }
      finally { setLoading(false) }
    }}>{loading ? "Redirecting…" : "Continue with Users.au"}</button>
    {failed && <p role="alert" className="mt-3 text-sm text-red-700">Could not start sign-in. Please try again.</p>}
  </>
}
