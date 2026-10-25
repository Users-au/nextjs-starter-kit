# Security and verification

This guide describes the starter's security controls, verification methods and
the application-specific responsibilities that integrations must implement.

## Implemented controls

| Area | Implemented behavior | Evidence |
| --- | --- | --- |
| Dependencies | Next.js 15.5.28, NextAuth 4.24.15 and React 19.3.1; patched transitive dependencies in the lockfile. Same-major PostCSS/brace-expansion overrides address upstream pinned/ranged dependencies. | Full npm audit includes dev dependencies; CI rejects low-or-higher vulnerabilities. Recheck override necessity on dependency updates. |
| Runtime | Node.js 24.22.1 / 22.23.4 baseline, strict engines/builds and server startup validation by default. A temporary Vercel-only operator exception is documented in the [deployment guide](../VERCEL_DEPLOYMENT.md#managed-runtime-patch-rollouts). | Version-boundary and exception-scope tests, startup version diagnostics and `.nvmrc`-selected CI; see the [October runtime security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). |
| Minimal session | Only identity/profile/session fields are retained; OAuth tokens and legacy token extras are discarded. | Unit callback checks and real production `/api/auth/session`/`api/profile` requests with legacy-token fixtures. |
| Server access | Explicit `all`/ID allowlist admission, current-policy checks in dashboard and protected API. | Server tests reject missing, expired, tampered and disallowed sessions, including direct API calls with middleware-spoofing headers. |
| Callback URLs | Same-origin path/query/fragment retained; external, encoded separator/control tricks and auth/API loops rejected. | Unit tests and configured NextAuth redirect callback. |
| Profile types | Typed Session/User/JWT and validated string/numeric IDs with usable image fallbacks. | Type check and profile fixtures including invalid/missing fields. |
| Configuration | Shared strict origin/secret/credential/admission validation; Next.js env loading before dev/build. | Config tests; errors report names only. Production requires non-loopback HTTPS. |
| OAuth | Empty default scope preserved explicitly, state checking enabled, stable provider/callback. | Production server generates a real authorization request; test verifies callback, state, code response and absent default scope. |
| Recovery/logout | Safe errors and retries; GET `/logout` confirms, CSRF-verified POST clears NextAuth before provider logout. | HTTP checks reject missing/forged CSRF, preserve sessions on GET and verify cookie clearing for JSON and native form POSTs. Provider logout still requires browser verification. |
| Installation | `env.example`, lockfile install, atomic private env creation and no overwrite of existing secrets. | Temp-directory tests cover special secret characters and permissions/preservation. |
| Build/CI | Direct ESLint, type checks, tests, strict build and server integration in CI; local system fonts remove external font downloads. | Pinned GitHub Actions with read-only permissions and non-secret fixtures; weekly Dependabot configuration. |

Audit results describe the dependency database at check time, not a guarantee of
future security. Consult the [Next.js October security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
and [NextAuth security advisories](https://github.com/nextauthjs/next-auth/security/advisories)
when maintaining these versions.

## Boundaries consumers must extend

The starter stores no business records and has no mutation/tenant APIs. Admission
decides who may enter; a consumer must add and test its own resource ownership,
role/write capabilities and tenant-scoped queries at each server entry point.
`all` is an explicit policy accepting every valid identity, not an admin role.

No OAuth tokens are retained after login. Add a separate reviewed server-side
token lifecycle only when provider API access is actually required. Do not expose
refresh tokens or invent a provider refresh/revocation/logout-return contract.

Synthetic integration tests sign session fixtures with a test-only key and
inspect generated OAuth requests. They do not contact Users.au or prove real
credentials, token exchange, consent behavior or provider logout. Use the manual
browser checklist with a registered test application for those steps.

## OAuth troubleshooting

| Symptom | Inspect | Verify after fixing |
| --- | --- | --- |
| `Callback` / `invalid_scope` | Redacted provider error and outgoing scope; normally empty env and explicit undefined scope in code. | Fresh browser sign-in through token exchange/profile load. |
| Callback mismatch or old origin | Exact registration, `NEXTAUTH_URL`, deployed env and proxy forwarding. | Generated `redirect_uri` equals the public app callback; login completes. |
| Access denied | Access mode and stable Users.au ID allowlist; do not change to `all` merely to hide a policy failure. | Intended members pass; excluded/removed members and old sessions fail server checks. |
| Account/logout wrong host | Validated identity origin and both Users.au host settings. | Provider `/account` and `/logout` open at the correct origin. |
| Next login silently reuses identity | Local sign-out completion and provider `/logout` navigation. | Both sessions clear and a fresh sign-in displays provider login UI. |
| Missing/inconsistent profile | `/api/user` field shape and image/ID normalization without logging tokens. | Profile/fallback fixtures and actual account display work. |
| Container/workspace-only failure | Env directory/injection, public build values, proxy and server provider connectivity. | Complete sign-in in the real topology. |
| Session lost on replica/restart | Stable NextAuth secret and cookie origin/protocol. | Repeated requests/restarts work without accidental secret rotation. |
| Ready deployment returns 500 | Runtime startup diagnostic and actual Node.js version; build and function versions can differ. | Patched function runtime passes startup. Any temporary managed-host exception is explicitly reviewed and recorded, not counted as a runtime patch. |

## Acceptance checklist

Record pass/fail/unverified with environment and evidence. Never include real
credentials, cookies or tokens in reports.

- [ ] `npm ci`, `npm run check`, production `npm run build` and
  `npm run test:integration` pass; current `npm audit --audit-level=low` is clean.
- [ ] Real env passes validation, invalid config fails with names only, and
  credentials/origins/callbacks are correct for each environment.
- [ ] Signed-out protected navigation redirects and direct private APIs fail.
- [ ] A real browser completes provider sign-in, token exchange and profile load;
  intended deep-link path/query survive and errors/denied consent recover.
- [ ] Identity/name/email/avatar/account link work, including missing-field cases.
- [ ] Browser sessions expose no OAuth tokens; application resource/role/tenant
  restrictions reject direct unauthorized reads and writes where implemented.
- [ ] Logout clears NextAuth, reaches provider logout, blocks private access and
  makes the next fresh sign-in display the provider login form.
- [ ] Target container/proxy/workspace env and callbacks work; a health response
  alone is not treated as authentication proof.
- [ ] Every changed repo has a PR link, summary, check outcomes and unverified
  steps; any production deployment has separate explicit authorization.
