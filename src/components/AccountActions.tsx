"use client"

import { LogoutButton } from "./LogoutButton"

export function AccountActions({ identityOrigin }: { identityOrigin: string }) {
  return <div>
    <div className="flex items-center gap-4">
      <a href={`${identityOrigin}/account`} className="text-sm underline">Manage account</a>
      <LogoutButton />
    </div>
  </div>
}
