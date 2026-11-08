"use client"

import { LogoutButton } from "./LogoutButton"

export function AccountActions() {
  return <div>
    <div className="flex items-center gap-4">
      <a href="/auth/usersau/account" className="text-sm underline">Manage account</a>
      <LogoutButton />
    </div>
  </div>
}
