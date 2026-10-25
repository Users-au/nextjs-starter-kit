import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: NonNullable<DefaultSession["user"]> & { usersauId?: string }
  }
  interface User {
    usersauId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    usersauId?: string
  }
}
