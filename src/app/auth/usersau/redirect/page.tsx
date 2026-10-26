import { UsersauRedirect } from "@/components/UsersauRedirect"
import { authEnvironment } from "@/lib/auth-config"
import { safeCallbackUrl } from "@/lib/auth-urls"

export const dynamic = "force-dynamic"

export default async function UsersauRedirectPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams
  const { appOrigin } = authEnvironment(process.env)
  return <UsersauRedirect callbackUrl={safeCallbackUrl(params.callbackUrl, appOrigin)} />
}
