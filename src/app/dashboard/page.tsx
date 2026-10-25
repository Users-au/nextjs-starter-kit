import { requireUser } from "@/lib/server-auth"
import { Dashboard } from "@/components/Dashboard"
import { authEnvironment } from "@/lib/auth-config"

export default async function DashboardPage() {
  const session = await requireUser()
  const { identityOrigin } = authEnvironment(process.env)
  return <Dashboard user={session.user} identityOrigin={identityOrigin} />
}
