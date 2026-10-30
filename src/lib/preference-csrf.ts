import { createHash, timingSafeEqual } from 'node:crypto'

/** Verify NextAuth's double-submit CSRF pair in addition to the strict Origin. */
export function preferenceCsrf(origin: string | null, csrf: string | null, cookie: string | undefined, appOrigin: string, secret: string): boolean {
  if (origin !== appOrigin || !csrf || !cookie) return false
  try {
    const [token, hash] = decodeURIComponent(cookie).split('|')
    const expected = createHash('sha256').update(`${csrf}${secret}`).digest('hex')
    return token === csrf && typeof hash === 'string' && hash.length === expected.length && timingSafeEqual(Buffer.from(hash), Buffer.from(expected))
  } catch { return false }
}
