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
  if (!supportedRuntime(version)) throw new Error("Use a patched Node.js LTS runtime: 24.22.1+ (24.x) or 22.23.4+ (22.x). See .nvmrc and the October 2026 Node.js security release.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) checkRuntime()
