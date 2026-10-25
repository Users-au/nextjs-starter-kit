# Deployment guide

Complete the [security/verification checklist](docs/READINESS.md). Deploy only
with the target environment's authorization; a merged PR is not deployment
authorization. Business permissions remain the consuming application's job.

## Vercel

### Create a new project with the CLI

Install the official [Vercel CLI](https://vercel.com/docs/cli), prepare the
application with the README's Node.js and lockfile setup, then run the following
from the app root. Replace `my-app` and `my-team` with your new project name and
the team shown by `vercel teams ls`. These examples use the CLI 65 syntax.

```bash
vercel login
vercel whoami
vercel teams ls
vercel project create my-app --scope my-team
vercel link --yes --project my-app --scope my-team
vercel project update my-app --framework nextjs \
  --install-command 'npm ci' --build-command 'npm run build' \
  --output-directory .next --scope my-team --yes
vercel api /v9/projects/my-app/domains --scope my-team
```

Complete the login in your own browser. Check the account/team before creating
anything. A project created with `project create` initially uses the Other
framework preset; set Next.js explicitly. In non-interactive mode, settings
updates require `--yes`; a confirmation-required response does not mean the
settings were applied.

The domain response identifies the project's actual stable `*.vercel.app`
production hostname before the first deployment. Use that hostname in
`NEXTAUTH_URL` and register its exact OAuth callback first. Do not infer the
hostname from the project name or register a temporary deployment URL.

`vercel link` creates local project metadata and may create `.env.local` with a
Vercel OIDC token. Treat that file as private and keep it out of source control
and deployment uploads. The starter includes `.vercelignore` because CLI uploads
do not use `.gitignore` as their source manifest. Before deploying, inspect:

```bash
vercel deploy --dry --json --scope my-team
```

Check that private env/key files and local build caches are excluded, while
`env.example`, source files and `package-lock.json` remain included.

CLI deployments do not require connecting a Git provider. Connecting a
repository for automatic deployments is a separate setup step that may require
additional repository permissions; do it only with the repository maintainer's
authorization.

### Dashboard and runtime settings

Import the repository. For a monorepo, select the Next.js workspace root and
adapt workspace install/build commands. Current `vercel.json` uses `npm ci`,
`npm run build`, `.next` output and `npm run dev` for development. The build
command includes strict production env validation and cannot bypass it.
Select Node.js 24.x with a patch at least 24.22.1 (or supported 22.x at least
22.23.4); an older hosting runtime fails startup rather than silently ignoring
the security baseline. CI follows `.nvmrc`.

### Configure Production before deploying

Supply environment values through hosting configuration, never committed files:

```dotenv
NEXTAUTH_URL=https://app.your-domain.com
NEXTAUTH_SECRET=use-a-generated-private-secret-at-least-32-characters
USERSAU_CLIENT_ID=real-environment-client-id
USERSAU_CLIENT_SECRET=real-environment-client-secret
USERSAU_HOST=https://identity.your-domain.com
USERSAU_SCOPE=
USERSAU_ACCESS_MODE=allowlist
USERSAU_ALLOWED_USER_IDS=42,100
NEXT_PUBLIC_APP_NAME="My Application"
NEXT_PUBLIC_USERSAU_HOST=https://identity.your-domain.com
```

Replace every example value. Keep the secret stable across deployments/replicas.
Both Users.au host variables mean the identity origin, **not** the application's
Vercel URL. Use `all` only if all authenticated identities should have membership;
custom roles/tenants still require server-side authorization.

Set all required variables for **Production** before a `--prod` deployment;
Development or Preview values do not configure Production. Enter OAuth client
credentials in the project's Environment Variables settings or supply them to
the CLI through protected stdin, and store private values as Secrets. Generate
a new app secret without putting it in shell history or command arguments:

```bash
openssl rand -base64 48 | vercel env add NEXTAUTH_SECRET \
  --environment production --sensitive --yes --scope my-team
vercel env ls --environment production --scope my-team
```

Generate it once per environment and preserve it on redeployments. The list
command checks variable names, targets and storage types; Secret values remain
hidden. Keep `USERSAU_SCOPE` unset/empty unless the OAuth app explicitly supports
requested scopes. Set both identity-host variables to the same real Users.au
origin. NextAuth derives its callback from `NEXTAUTH_URL`; this starter does not
read a separate `USERSAU_REDIRECT_URI` variable.

Register the exact public callback in Users.au:

```text
https://app.your-domain.com/api/auth/callback/usersau
```

Scope Development/Preview/Production env separately, preferably with separate
OAuth registrations/credentials. Use a stable preview domain with its exact
registered callback; do not assume arbitrary preview URLs or wildcard callbacks
are accepted. Public variables must be set before building; rebuild on changes.
See [Next.js env behavior](https://nextjs.org/docs/15/app/guides/environment-variables).

On app domain changes, coordinate `NEXTAUTH_URL`, registered callback and any
consumer public URLs. Change Users.au host variables only when the provider
domain changes. Verify the actual generated `redirect_uri` after any migration.

### Deploy and inspect

After configuration is complete:

```bash
vercel deploy --prod --logs --scope my-team
vercel project inspect my-app --scope my-team
vercel logs --environment production --query 'level:error' --since 5m --scope my-team
```

Check the deployment's Ready state and actual production alias. Verify the
stable production hostname in a browser; preview or deployment-specific URLs
may be protected by Vercel Authentication independently of Users.au login. Do
not disable deployment protection to work around an application auth problem.
Use authenticated Vercel CLI inspection where protection applies.

## Standalone, Docker and reverse proxies

`next.config.ts` emits standalone output. For a packaged standalone deployment,
include `.next/standalone`, copy `public` beside its `server.js`, and copy
`.next/static` into its `.next/static` directory. Run `node server.js` from that
output directory with the deployment's private env injected. Bind `HOSTNAME` and
`PORT` for the target container/network. Do not bake private `.env` files into
images or pass real private credentials through Docker build arguments.

Build-time config validation and server startup use the same contract; Next.js
instrumentation validates private config and the patched runtime before serving.
In a secret-free image builder, use clearly synthetic, non-secret build fixture
credentials with the intended public origins; inject real private values at
runtime. CI demonstrates fixture builds. Never deploy fixture
credentials as real authentication configuration.

Use the public browser-facing HTTPS origin in `NEXTAUTH_URL` and registration,
not `http://admin:3000`. Configure trusted proxy host/protocol forwarding for the
actual topology. Keep internal API addresses separate and private. In monorepos,
load Next.js env from the app workspace or inject it explicitly; a root env file
does not automatically configure every workspace. See [AI implementation](docs/AI_IMPLEMENTATION.md).

## Release verification

Run `npm run check`, `npm run build`, `npm run test:integration` and the current
dependency audit. Record all [acceptance outcomes](docs/READINESS.md#acceptance-checklist).

Then complete a real browser sign-in in the deployed environment: inspect scope
and callback, finish token exchange/profile/session setup, exercise permissions,
open account management, sign out of both sessions and verify the next login.
Test denied/error/expired cases. A build, health 200, generated authorization URL
or synthetic JWT test does not prove a live Users.au token exchange or logout.
