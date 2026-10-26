# AI implementation guide

Read [AGENTS.md](../AGENTS.md), [README.md](../README.md) and
[security/verification](READINESS.md), then inspect actual source, package/lockfile
and target-repository conventions. The starter supplies working authentication
and membership admission. Consumers own business permissions and infrastructure.

## Integration requirements

Preserve these authentication contracts when building an application from the
starter, regardless of its product domain or deployment architecture:

| Concern | Required behavior |
| --- | --- |
| OAuth scopes | Empty `USERSAU_SCOPE` stays explicit `scope: undefined`; request only registered scopes and test the generated authorization request after provider/library refactors. |
| Public endpoints | Use `/auth/usersau/redirect`, `/auth/usersau/callback` and `/logout`. Register the canonical callback and use it in both authorization and token exchange, preserving state checks. |
| Sign-out | No confirmation: GET automatically submits a CSRF-verified POST, clears NextAuth, then visits provider `/logout` with `continue` set to the trusted app `/auth/login`. Reject cross-site GET initiation and verify the return/next login in a browser. |
| Profile data | Validate string `usersauId`, apply usable `avatar`/`image`/`picture` fallbacks and retain profile/account UI. |
| Authorization | Use the server admission helper and extend it with application roles/resource ownership; never grant administrator access solely on login or email. |
| Return URLs | Retain same-origin path/query; public callback registration and the actual generated `redirect_uri` must agree. |
| Token handling | Keep sessions minimal and typed; do not retain or expose unused OAuth tokens. |
| Deployment configuration | Load env from the app root, distinguish application and identity origins, and separate public build values from private runtime injection. |

Keep domains, access policies and infrastructure configurable. Select databases,
queues and other services from the application's requirements rather than
assuming a particular project architecture.

## Implementation sequence

1. **Inventory the target.** Establish whether this is a new app, integration or
   monorepo; inspect package manager, runtime, dependency versions, scripts,
   existing auth and deployment topology. Keep NextAuth v4 unless a migration is
   part of the task. Resolve available context before asking for missing values.
2. **Define access.** List public/private routes, signed-in destination, identity
   origin and exact per-environment callback. Decide explicit `all` versus
   allowlist admission, onboarding, read/write roles, resource ownership and
   tenant boundaries. Use stable identity IDs; supporting multiple issuers needs
   issuer/provider namespacing, not email-only privileged account linking.
3. **Configure and validate.** Use setup for a new private env and preserve
   existing secrets. Never invent or disclose credentials. In monorepos, env must
   load from the Next.js workspace or be injected. Preserve empty scope, provider
   ID `usersau`, callback path and custom identity-domain support.
4. **Build from server access.** Use `getAuthOptions()` for NextAuth v4 options and
   `getAuthorizedSession()`/`requireUser()` before private data access. The layout
   alone is insufficient: guard each page/data operation, Route Handler and
   Server Action. Extend these checks with the product's role/resource/tenant
   policy and return appropriate 401/403 responses. Middleware/client UI do not
   enforce business permissions. A separate API needs its own enforcement.
5. **Keep identity data minimal.** Extend module augmentation rather than using
   `any`. Keep profile normalization/fallbacks, account links, safe callback
   handling, loading/error/retry states and ordered two-session logout. Do not
   reintroduce OAuth tokens to JWT/browser sessions. Provider API needs require a
   separate server-side storage/expiry/refresh/failure design; do not invent
   unsupported provider logout-return or revocation parameters. Users.au's
   verified logout return parameter is `continue`; derive it from the app origin.
6. **Adapt deployment.** Public `NEXTAUTH_URL` and OAuth registration must use the
   browser-facing HTTPS app origin, not Docker service names. Keep internal API
   URLs private, configure trusted proxy host/protocol forwarding and inspect the
   generated callback in that topology. Public bundle values are set before
   build; real private values are injected at runtime. Follow the
   [deployment guide](../VERCEL_DEPLOYMENT.md) and target app's operational rules.
   Verify the actual function runtime, not just the build version or Ready state.
   Do not automatically enable the managed-runtime patch-lag exception; it needs
   explicit operator acceptance of the documented risk.
7. **Verify behavior.** Run lockfile install, audit, checks, production build and
   server integration. Add tests for new membership/role/write/tenant controls,
   redirects and missing-profile states. Complete real browser sign-in/out with
   test credentials; distinguish synthetic tests/URL inspection from live token
   exchange and provider-session termination. Never hide failures by disabling
   lint/types or claiming unverified live behavior passed.
8. **Deliver every repo.** Fix reusable defects upstream and product behavior in
   the consumer. Update docs/env examples, commit, push and create/update PRs for
   each changed repo. Deliver all PR links, results and remaining limits. A
   pushed branch alone is incomplete; merge is not deployment authorization.

## Server implementation patterns

```ts
// A new private Route Handler: authenticate AND apply the resource policy.
const session = await getAuthorizedSession()
// Require the consumer's capability/tenant/ownership check here before data access.
```

`getAuthorizedSession()` throws `AccessError` with 401/403; `api/profile` shows
the HTTP conversion. `requireUser()` redirects pages to login/access denied.
Do not copy the profile API guard and then omit checks from a new mutation.

Login error displays use fixed messages and config names, not raw provider
responses. Keep logs equally minimal. `Callback` is a symptom: inspect the
redacted failure, registration and scope rather than treating every error as
`invalid_scope`. See [troubleshooting](READINESS.md#oauth-troubleshooting).

## Copyable implementation prompt

Resolve bracketed values from the repository or product requirements:

```text
Implement [product/use case] in [target repo/workspace], using
Users-au/nextjs-starter-kit as the authentication base. Read its AGENTS.md,
README.md, docs/AI_IMPLEMENTATION.md and docs/READINESS.md. Inspect actual
versions, source, scripts, lockfile and the target project's conventions.

Public app origin: [per environment]. Users.au origin: [per environment].
Signed-in destination/public routes: [paths]. Admission: [all or allowed IDs].
Business role/write/resource/tenant rules: [policy].
Topology: [Vercel/standalone/Docker/monorepo/reverse proxy].
Provider API use after login: [none or required operations].
Use placeholders for missing secrets; never invent/disclose credentials.

Preserve empty scope, provider ID/callback, typed minimal sessions, stable IDs,
profile fallbacks, account link, safe callbacks and ordered two-session logout.
Use the server admission helper and implement business permissions before every
private data operation. Middleware/client UI/layouts alone are insufficient.
Keep OAuth refresh/access tokens out of browser session data. Verify actual
build/runtime env loading and public callback generation. Do not silently
migrate auth/framework versions or add unrelated infrastructure.

Fix identified defects as part of implementation, including applicable security
findings. Update docs/env examples and add meaningful behavior tests. Run audit,
lint/types/tests, production build and integration checks. Report exact results
and any unverified real OAuth steps. Commit, push and create/update a PR in every
changed repository, then deliver links. Do not stop at a branch-pushed message
or deploy without explicit authorization. Keep reusable starter fixes separate
from product features and state remaining consumer-specific requirements.
```

## References

- [Next.js 15 authentication](https://nextjs.org/docs/15/app/guides/authentication)
- [Next.js 15 environment variables](https://nextjs.org/docs/15/app/guides/environment-variables)
- [NextAuth v4 server integration](https://next-auth.js.org/configuration/nextjs)
- [NextAuth v4 callbacks](https://next-auth.js.org/configuration/callbacks)

Recheck official documentation against installed versions when dependencies
change. Written requirements are not evidence of implemented business controls.
