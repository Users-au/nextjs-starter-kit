import type { NextRequest } from "next/server"
import { runAuthAction } from "@/lib/auth-handler"

function callback(request: NextRequest) {
  return runAuthAction(request, ["callback", "usersau"])
}

export { callback as GET, callback as POST }
