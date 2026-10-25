"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export function AccountActions({ identityOrigin }: { identityOrigin: string }) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div>
    <div className="flex items-center gap-4">
      <a href={`${identityOrigin}/account`} className="text-sm underline">Manage account</a>
      <button type="button" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={async () => {
        setLoading(true)
        setFailed(false)
        try {
          await signOut({ redirect: false })
          window.location.assign(`${identityOrigin}/logout`)
        } catch { setFailed(true); setLoading(false) }
      }}>{loading ? "Signing out…" : "Sign out"}</button>
    </div>
    {failed && <p role="alert" className="mt-2 text-sm text-red-700">Could not sign out. Please retry.</p>}
  </div>
}
