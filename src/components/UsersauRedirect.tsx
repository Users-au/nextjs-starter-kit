"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { signIn } from "next-auth/react"

export function UsersauRedirect({ callbackUrl }: { callbackUrl: string }) {
  const started = useRef(false)
  const [failed, setFailed] = useState(false)
  const begin = useCallback(async () => {
    if (started.current) return
    started.current = true
    setFailed(false)
    try {
      // NextAuth obtains and verifies its CSRF token before starting the OAuth flow.
      await signIn("usersau", { callbackUrl })
    } catch {
      started.current = false
      setFailed(true)
    }
  }, [callbackUrl])
  useEffect(() => { void begin() }, [begin])
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-xl font-semibold">{failed ? "Could not start sign-in" : "Redirecting to Users.au…"}</h1>
      {failed ? <button type="button" className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-white" onClick={() => { void begin() }}>Try again</button> : <p role="status" className="mt-4 text-sm text-gray-600">Starting a secure sign-in request.</p>}
      <noscript><p className="mt-4">Enable JavaScript to start Users.au sign-in.</p></noscript>
    </div>
  </main>
}
