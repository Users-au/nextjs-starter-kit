import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

/** @param {string} version */
export function supportedRuntime(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false
  const [major, minor, patch] = version.split(".").map(Number)
  return (major === 24 && (minor > 22 || (minor === 22 && patch >= 1))) ||
    (major === 22 && (minor > 23 || (minor === 23 && patch >= 4)))
}

export function checkRuntime(version = process.versions.node) {
  if (!supportedRuntime(version)) throw new Error(`Unsupported Node.js runtime ${version}. Use a patched Node.js LTS runtime: 24.22.1+ (24.x) or 22.23.4+ (22.x). See .nvmrc and the October 2026 Node.js security release.`)
}

/**
 * A managed-host patch rollout is an explicit operator decision, never a build bypass.
 * @param {string} version
 * @param {Record<string, string | undefined>} env
 * @param {(message: string) => void} warn
 */
export function checkServerRuntime(version = process.versions.node, env = process.env, warn = console.warn) {
  if (supportedRuntime(version)) return
  const supportedMajor = /^(22|24)\.\d+\.\d+$/.test(version)
  if (supportedMajor && env.VERCEL === "1" && env.USERSAU_ALLOW_MANAGED_PATCH_LAG === "true") {
    warn(`[runtime] Vercel-managed Node.js ${version} is below the application's patched runtime baseline. The operator explicitly allowed managed patch lag. Vercel WAF is not a replacement for the runtime patch; review https://vercel.com/kb/bulletin/node-js-security-advisory and remove this temporary exception after the provider rollout.`)
    return
  }
  checkRuntime(version)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) checkRuntime()
