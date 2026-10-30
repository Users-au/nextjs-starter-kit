import type { UsersauUser, InterfacePreferences } from '@users-au/client'
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: NonNullable<DefaultSession["user"]> & { usersauId?: string; preferences?: InterfacePreferences }
  }
  interface User {
    identityProfile?: UsersauUser
    usersauId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    preferences?: InterfacePreferences
    credentialId?: string
    usersauId?: string
  }
}
