import type { NextRequest } from 'next/server'
import { preferenceResponse } from '@/lib/server-preferences'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: NextRequest) { return preferenceResponse(request) }
export function PATCH(request: NextRequest) { return preferenceResponse(request) }
