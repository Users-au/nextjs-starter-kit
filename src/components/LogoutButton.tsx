"use client"

import { useState } from "react"
import { authPaths } from "@/lib/auth-paths"

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div>
    <button type="button" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => {
      setLoading(true)
      setFailed(false)
      try {
        window.location.assign(authPaths.logout)
      } catch { setFailed(true); setLoading(false) }
    }}>{loading ? "Signing out…" : "Sign out"}</button>
    {failed && <p role="alert" className="mt-2 text-sm text-red-700">Could not sign out. Please retry.</p>}
  </div>
}
