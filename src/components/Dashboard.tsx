"use client"

import type { Session } from "next-auth"
import { AccountActions } from "./AccountActions"
import Image from "next/image"

export function Dashboard({ user, identityOrigin }: { user: Session["user"]; identityOrigin: string }) {
  return <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{process.env.NEXT_PUBLIC_APP_NAME || "Users.au starter"}</h1>
        <AccountActions identityOrigin={identityOrigin} />
      </header>
      <section className="rounded-xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">Welcome, {user.name || "User"}</h2>
        <a href={`${identityOrigin}/account`} className="my-6 flex w-fit items-center gap-4 rounded p-1 focus-visible:outline-2 focus-visible:outline-indigo-600">
          {user.image ? <Image src={user.image} unoptimized width={64} height={64} alt="" className="rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl text-indigo-800">{(user.name || user.email || "U").slice(0, 1).toUpperCase()}</span>}
          <span><span className="block font-medium">{user.name || "User"}</span><span className="block text-sm text-gray-600">{user.email || "Email unavailable"}</span></span>
        </a>
        <dl className="grid gap-6 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div><dt className="text-sm text-gray-600">Users.au ID</dt><dd className="break-all">{user.usersauId}</dd></div>
          <div><dt className="text-sm text-gray-600">Session status</dt><dd>Authenticated</dd></div>
        </dl>
      </section>
    </div>
  </main>
}
