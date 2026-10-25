import { AccessError, getAuthorizedSession } from "@/lib/server-auth"

export async function GET() {
  try {
    const session = await getAuthorizedSession()
    return Response.json({ user: session.user }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (!(error instanceof AccessError)) throw error
    return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } })
  }
}
