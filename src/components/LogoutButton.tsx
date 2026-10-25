"use client"

import { useState } from "react"
import { getCsrfToken } from "next-auth/react"
import { authPaths } from "@/lib/auth-paths"

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div>
    <button type="button" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={async () => {
      setLoading(true)
      setFailed(false)
      try {
        const csrfToken = await getCsrfToken()
        if (!csrfToken) throw new Error("Sign-out unavailable")
        const response = await fetch(authPaths.logout, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body: new URLSearchParams({ csrfToken }),
        })
        if (!response.ok) throw new Error("Sign-out failed")
        const { url } = await response.json()
        window.location.assign(url)
      } catch { setFailed(true); setLoading(false) }
    }}>{loading ? "Signing out…" : "Sign out"}</button>
    {failed && <p role="alert" className="mt-2 text-sm text-red-700">Could not sign out. Please retry.</p>}
  </div>
}
