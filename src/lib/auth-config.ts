export type AuthEnvironment = Record<string, string | undefined>

const placeholder = /your[-_ ]|replace[-_ ]|placeholder|use-(?:the|a)-|real-environment-|\.example(?:\.com)?(?:[/:]|$)|your-subdomain|your_client/i
// Placeholder words can occur in real tenant domains. Reject reserved example
// hosts and the exact documented template hosts instead of arbitrary labels.
const exampleHost = /(^|\.)example(?:\.(?:com|net|org))?$|^(?:your-subdomain|your-domain)\.users\.au$/i

function origin(value: string | undefined, production: boolean) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (exampleHost.test(url.hostname.replace(/\.$/, ""))) return null
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local && !production)) return null
    if (production && local) return null
    return url.origin
  } catch {
    return null
  }
}

export function authConfigIssues(env: AuthEnvironment): string[] {
  const issues: string[] = []
  const production = env.NODE_ENV === "production"
  for (const key of ["NEXTAUTH_URL", "USERSAU_HOST", "NEXT_PUBLIC_USERSAU_HOST"]) {
    if (!origin(env[key], production)) issues.push(key)
  }
  for (const key of ["USERSAU_CLIENT_ID", "USERSAU_CLIENT_SECRET"]) {
    if (!env[key]?.trim() || placeholder.test(env[key]!)) issues.push(key)
  }
  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32 || placeholder.test(env.NEXTAUTH_SECRET)) {
    issues.push("NEXTAUTH_SECRET")
  }
  if (origin(env.USERSAU_HOST, production) && origin(env.NEXT_PUBLIC_USERSAU_HOST, production) &&
      origin(env.USERSAU_HOST, production) !== origin(env.NEXT_PUBLIC_USERSAU_HOST, production)) {
    issues.push("NEXT_PUBLIC_USERSAU_HOST")
  }
  if (!["all", "allowlist"].includes(env.USERSAU_ACCESS_MODE ?? "")) issues.push("USERSAU_ACCESS_MODE")
  if (env.USERSAU_ACCESS_MODE === "allowlist" && allowedUserIds(env).length === 0) issues.push("USERSAU_ALLOWED_USER_IDS")
  return [...new Set(issues)]
}

export function allowedUserIds(env: AuthEnvironment): string[] {
  return (env.USERSAU_ALLOWED_USER_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean)
}

export function authEnvironment(env: AuthEnvironment) {
  const issues = authConfigIssues(env)
  if (issues.length) throw new Error(`Invalid authentication configuration: ${issues.join(", ")}`)
  return {
    appOrigin: new URL(env.NEXTAUTH_URL!).origin,
    identityOrigin: new URL(env.USERSAU_HOST!).origin,
    clientId: env.USERSAU_CLIENT_ID!,
    clientSecret: env.USERSAU_CLIENT_SECRET!,
    secret: env.NEXTAUTH_SECRET!,
    scope: env.USERSAU_SCOPE?.trim() || undefined,
  }
}
