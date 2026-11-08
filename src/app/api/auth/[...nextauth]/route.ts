import type { NextRequest } from "next/server"
import { runAuthAction } from "@/lib/auth-handler"

async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return runAuthAction(request, (await context.params).nextauth)
}

export { handler as GET, handler as POST }
