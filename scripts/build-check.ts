import { loadEnvConfig } from "@next/env"
import { authConfigIssues } from "../src/lib/auth-config"
import { checkRuntime } from "./check-runtime.mjs"

checkRuntime()

const development = process.argv.includes("--development")
Object.assign(process.env, { NODE_ENV: development ? "development" : "production" })
loadEnvConfig(process.cwd(), development)
const issues = authConfigIssues(process.env)
if (issues.length) {
  console.error(`Invalid authentication configuration: ${issues.join(", ")}. See env.example and README.md.`)
  process.exitCode = 1
} else {
  console.log("Authentication configuration validated (values redacted).")
}
