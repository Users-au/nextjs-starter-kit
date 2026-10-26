export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkServerRuntime } = await import("../scripts/check-runtime.mjs")
    const { authEnvironment } = await import("./lib/auth-config")
    checkServerRuntime()
    authEnvironment(process.env)
  }
}
