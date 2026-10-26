import { authPaths } from "./auth-paths"

export const defaultCallback = "/dashboard"

export function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function safeCallbackUrl(value: string | undefined, baseUrl: string): string {
  try {
    if (!value || /[\\\x00-\x20\x7f]/.test(value) || value.startsWith("//")) return defaultCallback
    const base = new URL(baseUrl)
    const target = new URL(value, base)
    if (target.origin !== base.origin || target.username || target.password) return defaultCallback
    // Prevent encoded separators/control characters and double-decoding redirect tricks.
    const decodedPath = decodeURIComponent(target.pathname)
    if (/[\\%\x00-\x20\x7f]/.test(decodedPath) || decodedPath.startsWith("//")) return defaultCallback
    if (decodedPath === "/" || matchesRoute(decodedPath, "/auth") || matchesRoute(decodedPath, "/api") || matchesRoute(decodedPath, authPaths.logout)) return defaultCallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return defaultCallback
  }
}
