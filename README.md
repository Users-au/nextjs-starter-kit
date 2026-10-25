# Next.js Usersau Starter Kit

A Next.js App Router foundation for Users.au login, a protected dashboard and
profile API, account management and sign-out. Includes typed minimal sessions,
server-side identity admission, safe login return URLs and regression checks.

## Integrate Users.au into your app with AI

> [!TIP]
> **Copy the prompt below into your AI coding assistant with your application
> repository open.** It guides the assistant through implementation, configuration
> and verification in your existing app.

```text
Integrate Users.au OAuth authentication into this application using
https://github.com/Users-au/nextjs-starter-kit as the reference implementation.
Read its README.md, AGENTS.md, docs/AI_IMPLEMENTATION.md and docs/READINESS.md,
then inspect this app's framework, auth, routes, environment and deployment setup.
Implement the integration in this app, preserving its existing UI, features and
conventions. Check compatibility; do not silently migrate its framework/auth stack
or replace the application with the starter's demo.

Add sign-in, callback handling, protected pages/APIs, profile/avatar display,
an account-management link and local sign-out followed by Users.au logout.
Keep OAuth scopes empty unless explicitly registered, normalize stable user IDs,
keep OAuth tokens out of browser sessions, validate same-origin return URLs and
enforce this app's membership/role/resource rules on the server.

Infer app URLs, routes and deployment details from existing configuration.
Keep the public app origin separate from the Users.au identity origin. For
NextAuth integrations, preserve provider ID usersau and its callback path
/api/auth/callback/usersau. Update env examples and give me the exact callback
URLs to register in Users.au for each environment. Preserve existing secrets;
never invent, commit or print credentials. Ask only for required information or
access-policy decisions that cannot be resolved from the repository.

Complete the code, configuration and setup documentation. Run the project's
checks, dependency audit, build and relevant auth/access regression tests.
Verify real sign-in/out when test credentials are available; explicitly identify
any remaining setup or unverified live steps. Commit and open/update a PR using
the project's contribution workflow, and provide the PR link and check results.
```

Use a registered Users.au OAuth application and supply its credentials through
your app's private environment configuration. If credentials are not yet
available, the assistant can prepare the integration and registration steps;
live authentication verification requires those credentials. For application
requirements you want to specify upfront, use the
[detailed implementation prompt](docs/AI_IMPLEMENTATION.md#copyable-implementation-prompt).

## Documentation

- [AI implementation guide](docs/AI_IMPLEMENTATION.md): workflow, integration
  requirements, configuration contracts and a copyable implementation prompt.
- [Security and verification](docs/READINESS.md): implemented controls, how to
  verify them, and boundaries that business applications must extend.
- [Vercel deployment](VERCEL_DEPLOYMENT.md) and [agent instructions](AGENTS.md).

## Versions and requirements

Use patched Node.js 24.22.1+ (24.x) or 22.23.4+ (22.x); `.nvmrc` and CI use
24.22.1. Older/unsupported runtimes fail installation, startup and build checks.
These minimums include the [October 2026 runtime security fixes](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
Dependencies include
Next.js 15.5.28, NextAuth 4.24.15, React 19.3.1, TypeScript 5 and Tailwind CSS 4.
The npm lockfile records exact versions. Use NextAuth **v4** APIs with this code;
Auth.js v5 is a separate migration. Review versions and security advisories when
updating dependencies rather than treating this snapshot as permanently secure.

## Local setup

```bash
git clone https://github.com/Users-au/nextjs-starter-kit.git
cd nextjs-starter-kit
# With nvm installed:
nvm install
nvm use
npm ci
npm run setup
```

Setup copies `env.example` (no leading dot) to a private `.env.local`, generates
`NEXTAUTH_SECRET`, and never overwrites an existing file/secret. Alternatively,
`bash install.sh` runs the lockfile install and setup. Edit the resulting file:

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=use-the-private-value-generated-by-setup
USERSAU_CLIENT_ID=your-real-client-id
USERSAU_CLIENT_SECRET=your-real-client-secret
USERSAU_HOST=https://identity.your-domain.com
USERSAU_SCOPE=
USERSAU_ACCESS_MODE=allowlist
USERSAU_ALLOWED_USER_IDS=42,100
NEXT_PUBLIC_APP_NAME="My Application"
NEXT_PUBLIC_USERSAU_HOST=https://identity.your-domain.com
```

Replace example credentials, domains and IDs. `USERSAU_ACCESS_MODE=allowlist`
allows only the listed stable Users.au IDs. Use `all` deliberately for an app
that accepts any authenticated identity; the shipped env example selects `all`
for the demo. An absent/unknown mode or empty allowlist fails configuration.
This is membership admission, not business roles or tenant authorization.

In the [Users.au console](https://my.users.au), open the project's Integration >
OAuth Management, create an OAuth application and register exactly:

```text
http://localhost:3000/api/auth/callback/usersau
```

```bash
npm run dev
```

Open `http://localhost:3000`. Development startup validates config before starting
Next.js. Production build validation additionally requires non-loopback HTTPS
origins. Generate/register separate credentials and callbacks per environment.

## Environment contract

| Variable | Meaning |
| --- | --- |
| `NEXTAUTH_URL` | Public **application** origin with local port when applicable. Not the provider or an internal container/service URL. |
| `NEXTAUTH_SECRET` | Private secret of at least 32 characters; preserve across restarts and replicas. |
| `USERSAU_CLIENT_ID` / `USERSAU_CLIENT_SECRET` | Private configuration for this environment's OAuth registration. |
| `USERSAU_HOST` | Identity-provider origin; custom domains supported. No path, query, fragment or credentials. |
| `USERSAU_SCOPE` | Empty by default; set space-separated scopes only when explicitly supported by the OAuth registration. |
| `USERSAU_ACCESS_MODE` | Required explicit `all` or `allowlist` admission policy. |
| `USERSAU_ALLOWED_USER_IDS` | Comma-separated stable identity IDs, required for allowlist mode. Not email addresses. |
| `NEXT_PUBLIC_USERSAU_HOST` | Public identity origin, required to match `USERSAU_HOST`; never the app origin. |
| `NEXT_PUBLIC_APP_NAME` | Browser-visible display name. Also customize static metadata in `src/app/layout.tsx`. |

The registered callback is `${NEXTAUTH_URL}/api/auth/callback/usersau`. Origin
validation rejects placeholders, embedded credentials and unsafe URLs; HTTP
loopback is allowed only outside production. Trailing `/` is normalized.

`NEXT_PUBLIC_*` values are browser-visible and generally fixed when Next.js
builds client code. Never place secrets there; rebuild when public values change.
The dashboard/account actions receive the validated identity origin from the
server. See [Next.js environment variables](https://nextjs.org/docs/15/app/guides/environment-variables).

Requesting a scope that is not configured for the OAuth application can cause an
`invalid_scope` failure. Empty scope deliberately remains an explicit
`scope: undefined` in provider config, avoiding an underlying default `openid`
scope. Tests inspect the real NextAuth-generated request so refactors cannot
silently change this contract.

## Authentication and server access

Provider ID `usersau` uses `/oauth/authorize`, `/oauth/token` and `/api/user`.
Profiles normalize IDs to string `usersauId` and select a usable HTTP(S) image
from `avatar`, `image`, then `picture`. Missing/invalid identities are rejected.

The JWT and browser session contain only identity/profile/session fields. OAuth
access/refresh tokens are not retained or returned. Legacy token fields are
removed when a JWT is updated. The starter does not call provider APIs after
login and therefore does not need token refresh/storage/revocation features.

`getAuthorizedSession()` in `src/lib/server-auth.ts` checks a server session and
the current ID policy on each call. Dashboard layout **and page** use it via
`requireUser()`, while `/api/profile` independently returns 401/403 for rejected
requests. Updating the allowlist rejects old sessions on subsequent server
checks. Middleware only improves navigation and matches `/dashboard/:path*`.

For every new private Route Handler, Server Action or data read/write, call the
server helper and enforce the application's resource/role/tenant policy before
accessing data. The client `ProtectedRoute` is a presentation wrapper, not an
authorization boundary. See [NextAuth server sessions](https://next-auth.js.org/configuration/nextjs)
and [Next.js authorization](https://nextjs.org/docs/15/app/guides/authentication).

Login preserves same-origin return path/query and rejects external/encoded
redirect tricks and auth/API loops. Errors show safe messages, configuration
variable names and retry controls without credentials or raw provider responses.

Account links open the provider's `/account`. Sign-out awaits local NextAuth
sign-out before visiting provider `/logout`, with retry on failure. This clears
the two sessions; it does not invent provider logout-return or revocation APIs.

## Files and commands

| Path | Responsibility |
| --- | --- |
| `src/lib/auth.ts` | Lazy validated NextAuth v4 options, provider and callbacks |
| `src/lib/auth-config.ts` | Shared strict env validation |
| `src/lib/auth-policy.ts` / `server-auth.ts` | Profile/identity policy and server access enforcement |
| `src/lib/auth-urls.ts` | Safe callbacks and route-boundary matching |
| `src/app/api/profile/route.ts` | Protected server API example |
| `src/types/next-auth.d.ts` | Session, User and JWT types |
| `src/app/globals.css` | Tailwind 4 theme and local system font stack |
| `tests/` / `integration/` | Unit/security and production-server checks |

| Command | Purpose |
| --- | --- |
| `npm ci` / `npm run setup` | Reproducible install / safe initial private env creation |
| `npm run dev` | Validate development config and start Turbopack |
| `npm run lint` / `npm run type-check` | Direct ESLint with zero warnings / TypeScript |
| `npm test` | Unit/security regression tests; no real credentials needed |
| `npm run check` | Lint, types and unit tests |
| `npm run build:check` | Load production Next.js env files and validate without printing values |
| `npm run build` | Validate configuration and build; no remote font download required |
| `npm run test:integration` | Start the built production server with non-secret fixtures and exercise access/session/OAuth request checks |
| `npm run start` | Run the previously built Next.js app; inject its production env |
| `npm audit --audit-level=low` | Audit both production and development dependency vulnerabilities |

The integration test requires a successful build first and a local listening
socket. CI runs audit, checks, production build and integration tests with
non-secret fixtures. See [verification details](docs/READINESS.md).

## Contributing and delivery

Use a feature branch, commit and push task changes, and open/update a PR with the
problem, behavior and verification outcomes. Fixes to both this starter and a
consumer need a PR link for **each** repo. Pushing a branch alone is not delivery.
Merging a PR does not authorize production deployment.

## License and support

[MIT](https://opensource.org/licenses/MIT). Contact
[opensource@users.au](mailto:opensource@users.au) or open a GitHub issue.
