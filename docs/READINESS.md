# Security and verification

This guide describes the starter's security controls, verification methods and
the application-specific responsibilities that integrations must implement.

## Implemented controls

| Area | Implemented behavior | Evidence |
| --- | --- | --- |
| Dependencies | Next.js 15.5.28, NextAuth 4.24.15 and React 19.3.1; patched transitive dependencies in the lockfile. Same-major PostCSS/brace-expansion overrides address upstream pinned/ranged dependencies. | Full npm audit includes dev dependencies; CI rejects low-or-higher vulnerabilities. Recheck override necessity on dependency updates. |
| Runtime | Node.js 24.22.1 / 22.23.4 baseline, strict engines/builds and server startup validation by default. A temporary Vercel-only operator exception is documented in the [deployment guide](../VERCEL_DEPLOYMENT.md#managed-runtime-patch-rollouts). | Version-boundary and exception-scope tests, startup version diagnostics and `.nvmrc`-selected CI; see the [October runtime security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). |
| Minimal session | Identity/profile/session fields plus an opaque server grant handle and confirmed preference snapshot; OAuth tokens never enter JWT/session data. Legacy token extras are discarded. | Unit callback checks and real production `/api/auth/session`/`api/profile` requests with legacy-token fixtures. |
| Server access | Explicit `all`/ID allowlist admission, current-policy checks in dashboard and protected API. | Server tests reject missing, expired, tampered and disallowed sessions, including direct API calls with middleware-spoofing headers. |
| Callback URLs | Same-origin path/query/fragment retained; external, encoded separator/control tricks and auth/API loops rejected. | Unit tests and configured NextAuth redirect callback. |
| Profile types | Typed Session/User/JWT and validated string/numeric IDs with usable image fallbacks. | Type check and profile fixtures including invalid/missing fields. |
| Configuration | Shared strict origin/secret/credential/admission validation; Next.js env loading before dev/build. | Config tests; errors report names only. Production requires non-loopback HTTPS. |
| OAuth | Five registered identity/preference scopes by default, state checking enabled, stable provider/callback. | Production server generates a real authorization request; test verifies callback, state, code response and the five default scopes. |
| Recovery/logout | No confirmation; same-origin/direct GET automatically submits a CSRF-verified POST, clears NextAuth, then visits Users.au `/logout?continue=…` and returns to app login. A short-lived HttpOnly return cookie prevents loops when the provider returns to app `/logout`. | HTTP checks reject cross-site initiation and missing/forged CSRF, verify the script CSP/cookie clearing/return marker, and prevent request-controlled return URLs or skipping an existing local session. Provider logout still requires browser verification. |
| Installation | `env.example`, lockfile install, atomic private env creation and no overwrite of existing secrets. | Temp-directory tests cover special secret characters and permissions/preservation. |
| Build/CI | Direct ESLint, type checks, tests, strict build and server integration in CI; local system fonts remove external font downloads. | Pinned GitHub Actions with read-only permissions and non-secret fixtures; weekly Dependabot configuration. |

Audit results describe the dependency database at check time, not a guarantee of
future security. Consult the [Next.js October security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
and [NextAuth security advisories](https://github.com/nextauthjs/next-auth/security/advisories)
when maintaining these versions.

## Boundaries consumers must extend

The starter stores no business records. Account preference mutations require an
authenticated subject, same-origin CSRF checks and a matching version. Admission
decides who may enter; a consumer must add and test its own resource ownership,
role/write capabilities and tenant-scoped queries at each server entry point.
`all` is an explicit policy accepting every valid identity, not an admin role.

When preference synchronization is enabled, OAuth credentials live only in the
encrypted server vault. Production requires shared Redis REST storage; development
memory is temporary. Logout revokes the vault handle before the verified Users.au
`continue` redirect. See [identity preferences](identity-preferences.md) for refresh,
CSRF, subject/version checks and revocation races.

Synthetic integration tests sign session fixtures with a test-only key and
inspect generated OAuth requests. They do not contact Users.au or prove real
credentials, token exchange, consent behavior or provider logout. Use the manual
browser checklist with a registered test application for those steps.

## OAuth troubleshooting

| Symptom | Inspect | Verify after fixing |
| --- | --- | --- |
| `Callback` / `invalid_scope` | Redacted provider error and outgoing scope; register the five defaults or configure the intended supported scopes. | Fresh browser sign-in through token exchange/profile load. |
| Callback mismatch or old origin | Exact registration, `NEXTAUTH_URL`, deployed env and proxy forwarding. | Generated `redirect_uri` equals the public app callback; login completes. |
| Access denied | Confirm the intended policy: normal `all` sign-in needs no IDs; `allowlist` checks selected stable Users.au IDs. Do not remove an existing restriction merely to hide a failure. | Project accounts pass in `all` mode; only selected accounts pass in `allowlist` mode, including checks on old sessions. |
| New visitors can create accounts | Registration in the Users.au project's Login Flow settings. An app allowlist restricts app access, but does not close provider registration. | With Registration off, new self-service accounts are blocked and existing project accounts can still sign in. |
| Assistant asks for another issuer URL | `NEXTAUTH_URL` is the app; `USERSAU_HOST` is the project's hosted login service. A matching project/app name does not change its role. | Authorization/token/profile endpoints use the configured Users.au origin; the callback uses the app origin. No separate OIDC discovery is required by this starter. |
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
