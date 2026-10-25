import { randomBytes } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { checkRuntime } from "./check-runtime.mjs"

export function setupEnvironment(directory, secret = () => randomBytes(32).toString("base64url")) {
  const source = readFileSync(resolve(directory, "env.example"), "utf8")
  const content = source.replace(/^NEXTAUTH_SECRET=.*$/m, () => `NEXTAUTH_SECRET=${secret()}`)
  try {
    writeFileSync(resolve(directory, ".env.local"), content, { flag: "wx", mode: 0o600 })
    return "created"
  } catch (error) {
    if (error.code === "EEXIST") return "preserved"
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkRuntime()
  const result = setupEnvironment(process.cwd())
  console.log(result === "created" ? "Created private .env.local with a generated secret. Configure Users.au credentials, origins and access policy before starting." : "Existing .env.local preserved without changing its secret.")
}
