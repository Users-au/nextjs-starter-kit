import { pagePreferences } from '@/lib/server-preferences'
import { requireUser } from "@/lib/server-auth"
import { Dashboard } from "@/components/Dashboard"
import { authEnvironment } from "@/lib/auth-config"

export default async function DashboardPage() {
  const session = await requireUser()
  const { identityOrigin } = authEnvironment(process.env)
  const preferences = await pagePreferences()
  return <Dashboard user={session.user} identityOrigin={identityOrigin} preferences={preferences} />
}
