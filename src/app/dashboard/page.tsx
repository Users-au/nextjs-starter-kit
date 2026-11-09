import { pagePreferences } from '@/lib/server-preferences'
import { requireUser } from "@/lib/server-auth"
import { Dashboard } from "@/components/Dashboard"

export default async function DashboardPage() {
  const session = await requireUser()
  const preferences = await pagePreferences()
  return <Dashboard user={session.user} preferences={preferences} />
}
