export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkRuntime } = await import("../scripts/check-runtime.mjs")
    const { authEnvironment } = await import("./lib/auth-config")
    checkRuntime()
    authEnvironment(process.env)
  }
}
