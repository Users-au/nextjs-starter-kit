# AI implementation guide

Read [AGENTS.md](../AGENTS.md), [README.md](../README.md) and
[security/verification](READINESS.md), then inspect actual source, package/lockfile
and target-repository conventions. The starter supplies working authentication
and membership admission. Consumers own business permissions and infrastructure.

## Compiler compatibility

Keep the official side-by-side compiler installation: `@typescript/native`
aliases TypeScript 7 for the `tsc` CLI, while `typescript` aliases
`@typescript/typescript6` for ESLint and Next.js's JavaScript API. Run the
`type-check` script (both compiler versions) and the production build after
changing either package. Do not install TypeScript 7 directly as `typescript`
until all API consumers support it, or disable lint/type checks to work around
the API transition.

## Integration requirements

Preserve these authentication contracts when building an application from the
starter, regardless of its product domain or deployment architecture:

| Concern | Required behavior |
| --- | --- |
| OAuth scopes | Default `USERSAU_SCOPE` requests `openid profile email preferences:read preferences:write`; register these scopes and test the generated authorization request after provider/library refactors. |
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

## Resolve configuration before asking questions

Read the user's supplied configuration and the target app's existing private env
without displaying secrets. Reuse values that are already known. Ask only about
missing or contradictory information that actually blocks the next step; keep
implementing with placeholders when real credentials are pending. Never ask the
user to paste the Client Secret again just to clarify a URL.

Users.au hosts an authentication service for each project. A project URL such as
`https://<project>.users.au` is the login service even if the project is named
after the application being integrated. Configured custom identity domains work
the same way. The target application's address is a separate setting:

| Setting or endpoint | Meaning | Development example |
| --- | --- | --- |
| `NEXTAUTH_URL` | The application being integrated, including its local port | `http://localhost:3000` |
| `USERSAU_HOST` and `NEXT_PUBLIC_USERSAU_HOST` | The Users.au project's hosted login origin | `https://<project>.users.au` |
| Authorization | Provider endpoint on the Users.au origin | `https://<project>.users.au/oauth/authorize` |
| Token exchange | Server-to-server provider endpoint | `https://<project>.users.au/oauth/token` |
| User profile | Provider endpoint used after token exchange | `https://<project>.users.au/api/user` |
| Registered callback | On the target app, derived from `NEXTAUTH_URL` | `http://localhost:3000/auth/usersau/callback` |

Replace `<project>` with the actual project subdomain; these examples are not
credentials or deployable configuration. Localhost is a valid development app
origin/callback; keep the configured HTTPS Users.au service as the identity
origin. Never substitute the callback or app URL for `USERSAU_HOST`.

If supplied settings use a combined label such as **Application / Issuer URL**,
resolve its role from the configured host, callback and existing env. A supplied
Users.au project/login URL belongs in the identity host settings. A localhost
callback belongs to the application. Do not demand another identity URL merely
because the label or project name is ambiguous. If these values actually
conflict, ask about the specific missing/conflicting URL and explain which
setting it supplies, without requesting the credentials again.

This starter configures **OAuth 2.0 endpoints directly**. It does not require an
additional OIDC issuer, discovery document or JWKS URL. Standard profile and
preference scopes are requested by default. If the
target app explicitly requires OIDC, verify its provider metadata and supported
scopes as a separate requirement; do not turn that into a prerequisite for this
starter's normal OAuth integration.

## Ask about access only when a choice is needed

Use existing product requirements and access rules first. Otherwise ask one
plain-language question:

> Can everyone with an account in your Users.au project sign in, or should only
> selected users be allowed?

- **All project accounts:** set `USERSAU_ACCESS_MODE=all` explicitly and leave
  `USERSAU_ALLOWED_USER_IDS` empty. This is the normal integration flow. Do not
  ask users to look up their own user ID.
- **Existing accounts without public sign-ups:** explain how to turn off
  **Registration** (self-service registration) in the Users.au project admin's
  **Login Flow** settings. Keep `all` if every existing project account is
  allowed. Closing registration blocks new self-service accounts, including
  first-time passwordless/social sign-ups; existing accounts can still sign in.
  Review those accounts before relying on this choice.
- **Selected project accounts:** only then collect stable Users.au user IDs,
  set `USERSAU_ACCESS_MODE=allowlist` and populate `USERSAU_ALLOWED_USER_IDS`.
  Explain that these are project user IDs, not emails or the OAuth Client ID.
  Require a nonempty list and verify included/excluded accounts on the server.

Registration is a provider-side project setting, not an env switch implemented
by this starter. Do not claim it was changed without actually applying and
verifying it. It does not remove existing accounts/sessions, or replace an
allowlist when only a subset of existing users may enter. Keep an existing app's
restrictions unless the user asks to change them; never switch to `all` as a
workaround for denied access. Application roles/resource/tenant rules still
apply under either admission mode.

## Implementation sequence

1. **Inventory the target.** Establish whether this is a new app, integration or
   monorepo; inspect package manager, runtime, dependency versions, scripts,
   existing auth and deployment topology. Keep NextAuth v4 unless a migration is
   part of the task. Resolve available context before asking for missing values.
2. **Resolve URLs and access.** Reuse supplied/env configuration using the URL
   reference above. Derive exact per-environment callbacks from the app origin;
   a Users.au project domain already identifies the authentication service.
   List public/private routes and the signed-in destination. If access remains
   unspecified, ask the single question above; use explicit `all` for normal
   project sign-in, and collect IDs only for requested selected-user access.
   Explain closed Registration when public sign-ups are unwanted. Preserve
   business read/write roles, resource ownership and tenant boundaries. Use
   stable identity IDs; multiple identity providers need provider/issuer
   namespacing, not email-only privileged account linking.
3. **Configure and validate.** Use setup for a new private env and preserve
   existing secrets. Never invent or disclose credentials. In monorepos, env must
   load from the Next.js workspace or be injected. Preserve the registered default scopes, provider
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

Paste this into the target application's AI coding assistant. Existing repository
settings and supplied configuration take precedence over examples; users do not
need to fill in a separate questionnaire before implementation can begin:

```text
Integrate Users.au into this application using
https://github.com/Users-au/nextjs-starter-kit as the authentication reference.
Read its AGENTS.md, README.md, docs/AI_IMPLEMENTATION.md and docs/READINESS.md. Inspect actual
versions, source, scripts, lockfile and the target project's conventions.

Reuse configuration supplied in the conversation and the app's private env.
NEXTAUTH_URL is the application origin; localhost with its port is valid in dev.
USERSAU_HOST and NEXT_PUBLIC_USERSAU_HOST are the Users.au project's hosted login
origin: https://<project>.users.au or its configured custom identity domain.
This is the authentication service even when the project and application share
a name. Use that origin's /oauth/authorize, /oauth/token and /api/user endpoints.
The callback is NEXTAUTH_URL + /auth/usersau/callback, on the target application.
Resolve a label like "Application / Issuer URL" from those roles and existing env;
never treat a localhost callback as the identity origin. This starter uses OAuth
2.0 endpoints directly; do not require another OIDC issuer/discovery URL. Register
the default openid/profile/email and preference read/write scopes.
Ask only about genuinely missing/conflicting values after inspecting context.
Never ask users to repeat an identity URL or Client Secret already configured;
use placeholders for missing secrets and never invent, print or commit them.

Preserve existing access rules. If requirements leave access unspecified, ask
once: "Can everyone with an account in your Users.au project sign in, or should
only selected users be allowed?" Use explicit USERSAU_ACCESS_MODE=all for normal
project sign-in, leaving USERSAU_ALLOWED_USER_IDS empty. Only ask for stable
Users.au user IDs and enable allowlist when selected-user access is requested.
If public sign-ups are unwanted, explain how to turn off Registration in the
Users.au project's Login Flow settings. Existing accounts can still sign in;
review them first. An ID allowlist is needed only to exclude some existing users.
Do not claim a provider setting was changed without applying and verifying it.

Infer public/private routes, signed-in destination and deployment topology from
the actual app and requirements. Keep its business role/write/resource/tenant
rules; do not ask users to supply implementation details already in the repo.
Use the existing encrypted server vault when preference synchronization is
enabled. Production requires a private shared Redis REST store; see
docs/identity-preferences.md. Do not expose credentials to browser code.

Preserve the registered default scopes, provider ID/callback, typed minimal sessions, stable IDs,
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
