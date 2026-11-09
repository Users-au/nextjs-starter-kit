import { requireUser } from '@/lib/server-auth'
import { applicationContextUrl } from '@/lib/pushed-auth'

export async function GET() {
  await requireUser('/auth/usersau/account')
  try {
    return new Response(null, { status: 303, headers: { location: await applicationContextUrl(process.env, 'account'), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } })
  } catch {
    return new Response('Account management is temporarily unavailable', { status: 502, headers: { 'cache-control': 'no-store' } })
  }
}
