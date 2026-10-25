import { AccountActions } from "@/components/AccountActions"
import { authEnvironment } from "@/lib/auth-config"

export const dynamic = "force-dynamic"

export default function AccessDeniedPage() {
  const { identityOrigin } = authEnvironment(process.env)
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
    <div className="max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="my-5">This account is not allowed to access this application. Contact the app operator or sign out to use another account.</p>
      <AccountActions identityOrigin={identityOrigin} />
    </div>
  </main>
}
