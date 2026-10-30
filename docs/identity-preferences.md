# Identity profiles and account preferences

## Contract and runtime

The frontend client 2 source tag supplies pure normalization/types for standard UserInfo and the Auth preference contract. The confidential starter keeps its NextAuth server login, canonical callback, state checks and access policy; it does not mount the browser PKCE client. Default scopes are openid/profile/email/preferences:read/preferences:write. Phone/address remain independent opt-ins. Identity is configured issuer + sub; unknown claims and unsafe URLs are omitted.

## Credential ownership

USERSAU_PREFERENCES_ENABLED=true enables server writeback. In development the grant vault uses encrypted per-application/issuer memory records. Production requires USERSAU_GRANT_STORE_URL and USERSAU_GRANT_STORE_TOKEN for an HTTPS Redis REST endpoint supporting GET/SET/EVAL/DEL. Reuse a suitable managed store; setup does not create resources. Unconfigured production sync fails configuration validation instead of using process memory. Keep Node at the checked .nvmrc baseline.

OAuth access/refresh tokens and full normalized profiles are encrypted with AES-256-GCM using NEXTAUTH_SECRET and stored only in the server vault. The encrypted NextAuth cookie contains an opaque random grant handle and a small confirmed preference snapshot; browser session JSON exposes neither the handle nor tokens. All replicas need the same secret and persistent store. Grant lifetime is at most 30 days; secret/issuer changes require an explicit migration or reauthorization. Never put vault credentials in NEXT_PUBLIC variables.

JWT callbacks verify grant ownership when sync is enabled; revoked/missing grants and store failures fail authorization. Logout removes the record and leaves an atomic revocation marker so late refresh/save responses cannot resurrect it. Redis locks serialize token rotation and cache updates; refresh never requests additional scopes. The store uses TTLs and owner-checked lock release. Development memory is a demo backend, not serverless/multi-process persistence.

## Interfaces and UI

GET/PATCH /api/account/preferences enforce server session membership policy, fixed issuer and subject, and no-store responses. PATCH requires JSON, the exact application Origin and NextAuth's CSRF double-submit pair. Only locale/timezone/theme and expected_version are accepted; request user_id/issuer cannot choose another account. GET /api/account/profile returns the cached normalized profile without credentials. Existing /api/profile keeps its safe session projection.

The dashboard uses a confirmed snapshot; RootLayout reads preferences before first paint with request-scoped React caching. The panel fetches on entry/focus, follows system appearance changes, handles 409 by displaying canonical values, and cleans up listeners. Saves show explicit reauthorization/retry errors and ignore results from prior accounts. HTML lang follows the saved locale; applications add their own translated catalogs and use the saved IANA timezone with Intl formatters. The starter's existing UI copy is English.

Provider outages retain the vault's confirmed preferences. Vault outages prevent authorization; they cannot be replaced by an arbitrary browser profile. Auth mutation and vault persistence are not a distributed transaction: if persistence fails after Auth commits, the save reports failure and a later authorized read repairs the copy. GET session renewal is handled by NextAuth, including encrypted/chunked cookie handling.

## Rollout and validation

Deploy Auth and its tenant migration first. Install the frontend source release, configure the server vault, deploy the starter, and sign in again for the new scopes. Token refresh cannot add permissions. Run npm ci, npm run check, npm run build and npm run test:integration. Tests cover subject/issuer isolation, field whitelists, versions/conflicts, bounded refresh, cookie/session credential separation, CSRF, store requirements, encrypted persistence and logout races.

Protocol: [shared-saas guide](https://github.com/sicaboy/shared-saas/blob/v5.11.0/docs/identity-profile-preferences.md). References: [NextAuth session/JWT callbacks](https://next-auth.js.org/configuration/callbacks), [Redis REST commands](https://upstash.com/docs/redis/features/restapi), [Redis locks](https://redis.io/docs/latest/commands/set/).
