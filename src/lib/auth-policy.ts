import { normalizeUserInfo } from '@users-au/client'
import type { Session } from "next-auth"
import { allowedUserIds, type AuthEnvironment } from "./auth-config"

export function validIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim() && value.length <= 255 && !/[\s\x00-\x1f\x7f]/.test(value)
}

export function identityAllowed(id: unknown, env: AuthEnvironment): boolean {
  if (!validIdentity(id)) return false
  if (env.USERSAU_ACCESS_MODE === "all") return true
  return env.USERSAU_ACCESS_MODE === "allowlist" && allowedUserIds(env).includes(id)
}

export function accessDecision(session: Session | null, env: AuthEnvironment): "allowed" | "unauthenticated" | "forbidden" {
  if (!validIdentity(session?.user?.usersauId)) return "unauthenticated"
  return identityAllowed(session!.user.usersauId, env) ? "allowed" : "forbidden"
}

export function normalizeProfile(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid Users.au profile")
  const raw = value as Record<string, unknown>
  if (raw.sub == null && typeof raw.id === 'number' && (!Number.isSafeInteger(raw.id) || raw.id < 0)) throw new Error('Invalid Users.au identity')
  const picture = [raw.picture, raw.avatar, raw.image].find(value => {
    if (typeof value !== 'string') return false
    try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
  })
  const profile = normalizeUserInfo({ ...raw, picture })
  const id = profile.sub
  if (!validIdentity(id)) throw new Error("Invalid Users.au identity")
  return {
    id,
    usersauId: id,
    name: typeof profile.name === "string" ? profile.name : null,
    email: typeof profile.email === "string" ? profile.email : null,
    image: profile.picture ?? null,
    identityProfile: profile,
  }
}
