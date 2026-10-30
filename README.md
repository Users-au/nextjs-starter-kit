<div align="center">

# Users.au × Next.js Starter Kit

**Hosted authentication. Your application. A practical starting point.**

[Live demo](https://usersau-nextjs-starter.vercel.app) · [AI quick start](#integrate-usersau-into-your-app-with-ai) · [Screenshots](#usersau-in-action) · [Deployment](VERCEL_DEPLOYMENT.md) · [Users.au](https://www.users.au)

[![Checks](https://img.shields.io/github/actions/workflow/status/Users-au/nextjs-starter-kit/ci.yml?branch=main&style=flat-square)](https://github.com/Users-au/nextjs-starter-kit/actions/workflows/ci.yml) [![MIT license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT) [![Issues](https://img.shields.io/github/issues/Users-au/nextjs-starter-kit?style=flat-square)](https://github.com/Users-au/nextjs-starter-kit/issues) [![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/Users-au/nextjs-starter-kit/pulls) [![Node.js](https://img.shields.io/badge/node-22.23.4%2B%20%7C%2024.22.1%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#versions-and-requirements) [![Live demo](https://img.shields.io/badge/demo-Vercel-black?style=flat-square&logo=vercel)](https://usersau-nextjs-starter.vercel.app)

</div>

A Next.js App Router starter with typed minimal sessions, a protected dashboard,
profile API, account management and automatic sign-out.

| 🔐 Connect your identity | 🧩 Build your application | 🛡️ Keep checks on the server |
| --- | --- | --- |
| Users.au OAuth, custom identity domains and profile/avatar support. | Next.js, React, TypeScript and Tailwind, with a working Vercel demo. | Explicit membership admission, safe return URLs and minimal session data. |

## Integrate Users.au into your app with AI

> [!TIP]
> **Open your application repository in an AI coding assistant and paste this
> prompt.** Keep your existing application and let the assistant implement and
> verify the integration.

```text
Integrate Users.au into this application using
https://github.com/Users-au/nextjs-starter-kit as the reference.
Read its README.md, AGENTS.md, docs/AI_IMPLEMENTATION.md and docs/READINESS.md;
inspect this app's versions, auth, routes, environment and deployment conventions.
Reuse configuration already supplied in this conversation or the app's private env.
NEXTAUTH_URL is this application's origin (localhost with its port is valid in dev).
USERSAU_HOST and NEXT_PUBLIC_USERSAU_HOST are the Users.au project's hosted login
origin: https://<project>.users.au or its configured custom identity domain.
That project URL serves authentication even if its name matches this application.
Resolve an ambiguous "Application / Issuer URL" label using those roles and env.
Use its /oauth/authorize, /oauth/token and /api/user endpoints; the callback is
NEXTAUTH_URL + /auth/usersau/callback, on this application, not on Users.au.
This starter uses OAuth 2.0 directly; no separate OIDC issuer/discovery URL is needed.
Ask only for genuinely missing or conflicting values after inspecting context;
do not ask users to repeat the identity URL or Client Secret already configured.
If access requirements are unspecified, ask once in plain language whether all
accounts in this Users.au project may sign in or only selected users may sign in.
Use USERSAU_ACCESS_MODE=all for the normal flow; ask for stable user IDs and enable
allowlist only when selected-user access is requested. Preserve existing restrictions.
To stop public self-registration, explain how to turn off Registration in the
Users.au project's Login Flow settings. Existing accounts can still sign in;
add an ID allowlist only if a subset of those accounts should enter.
Preserve its UI/features and use compatible auth APIs; keep provider ID usersau.
Implement /auth/usersau/redirect, /auth/usersau/callback, protected pages/APIs,
profile/avatar/account UI and local sign-out followed by Users.au logout/return.
Use the registered identity/preference scopes, preserve state/CSRF checks, validate local
return URLs and stable user IDs, and keep OAuth tokens out of browser sessions.
Enforce membership/role/resource rules on the server. Keep application and identity
origins separate; never invent, commit or print secrets. Report exact callback URLs to register.
Update docs/env examples; run checks, audit, build and auth/access regression tests.
Verify real sign-in/out when credentials are available and identify unverified steps.
Commit and open/update a PR, then report the PR link and validation results.
```

Supply OAuth credentials through private environment configuration. The assistant
can prepare implementation while registration is pending; real authentication
verification needs a registered app. See the [full AI implementation guide](docs/AI_IMPLEMENTATION.md).

## Users.au in action

Users.au hosts the authentication experience on your identity domain. Enable the
sign-in methods available to your project and connect them to your application
through OAuth. These official product screenshots show the hosted experience.

<table>
  <tr><th>🔑 Branded sign-in & social providers</th><th>🛡️ Multi-factor authentication</th></tr>
  <tr>
    <td width="50%"><a href="docs/images/usersau-social.png"><img src="docs/images/usersau-social.png" alt="Users.au branded sign-in with Google, Facebook and GitHub options" width="440"></a></td>
    <td width="50%"><a href="docs/images/usersau-mfa.png"><img src="docs/images/usersau-mfa.png" alt="Users.au authenticator-code challenge with recovery-code option" width="440"></a></td>
  </tr>
</table>

<details>
<summary><strong>👆 Preview the passkey experience</strong></summary>

![Users.au passkey sign-in with a Touch ID prompt](docs/images/usersau-passkey.png)

</details>

[Explore Users.au](https://www.users.au) · [Create a project](https://my.users.au) · [Image sources](docs/images/README.md)

## Live Vercel demo

Try the **[live Users.au starter demo](https://usersau-nextjs-starter.vercel.app)**
to explore sign-in, the protected dashboard, account management and sign-out.

[![Users.au starter sign-in screen deployed on Vercel](docs/images/vercel-demo.jpg)](https://usersau-nextjs-starter.vercel.app)

Deploy your own app with its own OAuth registration and environment settings;
see the [Vercel deployment guide](VERCEL_DEPLOYMENT.md).

## Documentation

- [AI implementation guide](docs/AI_IMPLEMENTATION.md): workflow, integration
  requirements, configuration contracts and a copyable implementation prompt.
- [Security and verification](docs/READINESS.md): implemented controls, how to
  verify them, and boundaries that business applications must extend.
- [Vercel deployment](VERCEL_DEPLOYMENT.md) and [agent instructions](AGENTS.md).

## Versions and requirements

Use patched Node.js 24.22.1+ (24.x) or 22.23.4+ (22.x); `.nvmrc` and CI use
24.22.1. Older/unsupported runtimes fail installation, startup and build checks
by default. See the [managed-host patch rollout policy](VERCEL_DEPLOYMENT.md#managed-runtime-patch-rollouts)
before considering any temporary Vercel runtime exception.
These minimums include the [October 2026 runtime security fixes](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
Dependencies include
Next.js 15.5.28, NextAuth 4.24.15, React 19.3.1, TypeScript 7 (with the TypeScript 6 API compatibility package) and Tailwind CSS 4.
The npm lockfile records exact versions. Use NextAuth **v4** APIs with this code;
Auth.js v5 is a separate migration. Review versions and security advisories when
updating dependencies rather than treating this snapshot as permanently secure.

TypeScript 7 supplies the native `tsc` executable through the
`@typescript/native` npm alias. The `typescript` alias points to Microsoft's
`@typescript/typescript6` compatibility package so ESLint and Next.js can use
the supported JavaScript compiler API. This follows Microsoft's
[side-by-side installation guide](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
`npm run type-check` runs both `tsc` and `tsc6`; production build checks remain
enabled. Keep these aliases together when updating the compiler/tooling.

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
USERSAU_ACCESS_MODE=all
USERSAU_ALLOWED_USER_IDS=
NEXT_PUBLIC_APP_NAME="My Application"
NEXT_PUBLIC_USERSAU_HOST=https://identity.your-domain.com
```

Replace example credentials and domains. The normal setup uses
`USERSAU_ACCESS_MODE=all`: anyone authenticated by **your Users.au project** can
sign in. No user IDs are needed; visitors still have to authenticate.
See [login access and registration](#login-access-and-registration) for the
optional restriction to selected accounts.

In the [Users.au console](https://my.users.au), open the project's Integration >
OAuth Management, create an OAuth application and register exactly:

```text
http://localhost:3000/auth/usersau/callback
```

```bash
npm run dev
```

Open `http://localhost:3000`. Development startup validates config before starting
Next.js. Production build validation additionally requires non-loopback HTTPS
origins. Generate/register separate credentials and callbacks per environment.

## Login access and registration

Choose the behavior you need before collecting user IDs:

| Who should be able to sign in? | Configuration |
| --- | --- |
| Anyone with an account in your Users.au project | Keep `USERSAU_ACCESS_MODE=all` and leave `USERSAU_ALLOWED_USER_IDS` empty. |
| Existing project accounts, without public self-registration | Keep `all`; in the Users.au project admin, open **Login Flow** and turn off **Registration** (self-service registration). |
| Only selected accounts from your project | Set `USERSAU_ACCESS_MODE=allowlist` and list their stable Users.au user IDs in `USERSAU_ALLOWED_USER_IDS`, for example `42,100`. |

Closing Registration prevents new self-service accounts, including first-time
passwordless/social sign-ups. Existing project accounts can still sign in.
Review those accounts first; closing registration does not revoke their access.
Use an allowlist only if some existing accounts must also be excluded. It can
be combined with closed registration, and IDs are needed only in that mode.
The AI integration prompt asks about this choice if requirements are unclear;
finding your own user ID is not a prerequisite for normal integration.

Keep the chosen mode explicit: an absent/unknown mode, or an empty allowlist
in `allowlist` mode, fails configuration. These settings control login admission;
application roles, resource permissions and tenant authorization still belong
on the server. Preserve an existing application's access restrictions.

## Environment contract

| Variable | Meaning |
| --- | --- |
| `NEXTAUTH_URL` | Public **application** origin with local port when applicable. Not the provider or an internal container/service URL. |
| `NEXTAUTH_SECRET` | Private secret of at least 32 characters; preserve across restarts and replicas. |
| `USERSAU_CLIENT_ID` / `USERSAU_CLIENT_SECRET` | Private configuration for this environment's OAuth registration. |
| `USERSAU_HOST` | Your Users.au project's hosted login origin, such as `https://<project>.users.au` or its custom identity domain. No path, query, fragment or credentials. |
| `USERSAU_SCOPE` | Defaults to `openid profile email preferences:read preferences:write`; register these permissions on the OAuth application. |
| `USERSAU_PREFERENCES_ENABLED` | Set `true` to enable profile/preference synchronization and server-side credential storage. |
| `USERSAU_GRANT_STORE_URL` / `USERSAU_GRANT_STORE_TOKEN` | Private HTTPS Redis REST endpoint and token; required in production when synchronization is enabled. |
| `USERSAU_ACCESS_MODE` | Explicit login policy: `all` for normal project sign-in; optional `allowlist` for selected accounts. |
| `USERSAU_ALLOWED_USER_IDS` | Leave empty in `all` mode. Comma-separated stable identity IDs required only in `allowlist` mode; not email addresses. |
| `NEXT_PUBLIC_USERSAU_HOST` | Public identity origin, required to match `USERSAU_HOST`; never the app origin. |
| `NEXT_PUBLIC_APP_NAME` | Browser-visible display name. Also customize static metadata in `src/app/layout.tsx`. |

The registered callback is `${NEXTAUTH_URL}/auth/usersau/callback`. Origin
validation rejects placeholders, embedded credentials and unsafe URLs; HTTP
loopback is allowed only outside production. Trailing `/` is normalized.

The Users.au project domain is the authentication service, even if it shares
your application's name. The app can run at `http://localhost:3000` while login
runs at `https://<project>.users.au`. This starter configures OAuth endpoints
directly and does not require a separate OIDC issuer or discovery URL. See the
[URL reference and AI guidance](docs/AI_IMPLEMENTATION.md#resolve-configuration-before-asking-questions).

`NEXT_PUBLIC_*` values are browser-visible and generally fixed when Next.js
builds client code. Never place secrets there; rebuild when public values change.
The dashboard/account actions receive the validated identity origin from the
server. See [Next.js environment variables](https://nextjs.org/docs/15/app/guides/environment-variables).

Register the default five scopes before rollout. Requesting an unsupported scope
can cause `invalid_scope`; custom scopes must include both preference permissions
when synchronization is enabled. Existing grants require fresh authorization.
Tests inspect the actual NextAuth-generated request.

## Authentication and server access

Provider ID `usersau` uses `/oauth/authorize`, `/oauth/token` and `/api/user`.
Profiles normalize IDs to string `usersauId` and select a usable HTTP(S) image
from `avatar`, `image`, then `picture`. Missing/invalid identities are rejected.

OAuth tokens never enter browser session JSON or the encrypted NextAuth JWT.
With synchronization enabled, the JWT contains an opaque grant handle and a small
confirmed preference snapshot. Tokens and full normalized profiles are encrypted
in the server vault, refreshed only when needed, and removed on sign-out.
Without synchronization, credentials are discarded after login. Legacy token
fields are removed when a JWT is updated.

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

The public authentication endpoints are:

| Endpoint | Behavior |
| --- | --- |
| `/auth/usersau/redirect` | Starts sign-in automatically in the browser using NextAuth's CSRF-protected POST. Accepts a validated local `callbackUrl`; JavaScript is required. |
| `/auth/usersau/callback` | Receives Users.au's OAuth response. Register this exact app URL; authorization and token exchange use the same URI and verify OAuth state. |
| `/logout` | Starts sign-out automatically with no confirmation. A CSRF-verified POST clears the local session, visits Users.au `/logout?continue=…`, then returns to the app's `/auth/login`. JavaScript is required for the GET entry. |

NextAuth's internal `/api/auth/*` routes still provide sessions, CSRF and the
sign-in engine. When upgrading an older starter, replace the registered
`/api/auth/callback/usersau` callback with `/auth/usersau/callback` and redeploy
the application together. Do not merely add a redirect between callback URLs:
the token exchange must use the originally registered URI.

Account links open the provider's `/account`. Sign-out awaits local NextAuth
sign-out before visiting provider `/logout`, with retry on failure. The verified
Users.au `continue` parameter returns to the configured app's `/auth/login`;
request input cannot change this destination. The automatic GET entry accepts
same-origin or direct browser navigation and rejects cross-site initiation.
If the identity service returns to the registered app `/logout` instead, a
short-lived HttpOnly cookie completes that return at `/auth/login` without
restarting remote logout. The return shortcut is unavailable while a local
session cookie remains.
This clears the two sessions without inventing token revocation APIs. See the
[official Users.au logout implementation](https://github.com/Users-au/laravel-client/blob/main/src/Http/Controllers/AuthController.php).

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
| `npm run lint` / `npm run type-check` | Direct ESLint with zero warnings / TypeScript 7 and 6 compatibility checks |
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

## Choose your integration

| Project | Use it when you want to… |
| --- | --- |
| [**Next.js starter — this repo**](https://github.com/Users-au/nextjs-starter-kit) | Start a Next.js app with server-managed OAuth sessions and a protected dashboard. |
| [Laravel starter](https://github.com/Users-au/laravel-starter-kit) | Start a Laravel app with Blade templates and Users.au integration. |
| [Laravel client](https://github.com/Users-au/laravel-client) | Add local user synchronization and authentication routes to a Laravel app. |
| [Socialite provider](https://github.com/Users-au/socialite-provider) | Connect an existing Laravel Socialite authentication flow to Users.au. |
| [Frontend client](https://github.com/Users-au/frontend-client) | Use public-client OAuth with PKCE in JavaScript, Vue or React. |

## Contributing and delivery

Use a feature branch, commit and push task changes, and open/update a PR with the
problem, behavior and verification outcomes. Fixes to both this starter and a
consumer need a PR link for **each** repo. Pushing a branch alone is not delivery.
Merging a PR does not authorize production deployment.

## License and support

[MIT](https://opensource.org/licenses/MIT). Contact
[opensource@users.au](mailto:opensource@users.au) or open a GitHub issue.

## Identity profiles and account preferences

The starter uses the built Users.au client 2 source tag for the same standard claims/preferences schema as Laravel SDK 2.1. It requests standard identity and preference scopes, renders saved theme before first paint, and offers locale/timezone/theme writeback in the dashboard. OAuth credentials remain in an encrypted server-side vault; browser JSON only receives safe identity fields and confirmed preferences.

See [identity preferences](docs/identity-preferences.md) for production Redis REST configuration, CSRF, revocation, conflicts and rollout. Set USERSAU_PREFERENCES_ENABLED=true to enable this integration. Production requires a persistent shared store; development uses memory. No database or Redis resource is automatically provisioned. Existing sessions need fresh authorization for the added scopes.
