# Implementing applications from this starter

Read [README.md](README.md), [the AI implementation guide](docs/AI_IMPLEMENTATION.md)
and [the readiness checklist](docs/READINESS.md) before changing authentication or
building a downstream app. Inspect source and lockfile; a demo or successful build
does not establish production readiness.

## Authentication contract

- Keep provider ID `usersau` and the public `/auth/usersau/redirect`,
  `/auth/usersau/callback` and `/logout` endpoints unless a migration
  updates all consumers and OAuth registrations.
- Leave `USERSAU_SCOPE` empty by default. Preserve explicit `scope: undefined`
  when empty; do not substitute `read`, `openid` or an omitted key without
  verifying the outgoing request and registered scopes.
- `NEXTAUTH_URL` is the public application origin. `USERSAU_HOST` and
  `NEXT_PUBLIC_USERSAU_HOST` are the identity origin, including custom domains.
  Never bake downstream-specific domains into the reusable template.
- Keep string `usersauId`, avatar fallbacks (`avatar`, `image`, `picture`) and
  account management at the configured provider's `/account`.
- Clear NextAuth before navigating to Users.au `/logout`. Do not invent logout
  return parameters, token revocation or refresh behavior.
- Preserve CSRF checks on sign-in and sign-out. GET `/logout` must not clear a
  session. Pass OAuth state checks and the canonical callback URI to the token
  exchange; changing an authorization URL alone is insufficient.
- Enforce identity, membership, ownership and read/write permissions at server
  data access, Route Handlers and Server Actions. Middleware excludes `/api`;
  client wrappers only help presentation/navigation.
- Keep JWT and browser session data minimal. Never reintroduce OAuth tokens.
  Never return refresh tokens
  to browser code or log credentials, session cookies or token responses.

## Implementation and delivery

- Inventory actual versions, scripts, env loading, routes and topology first.
  Use NextAuth v4 APIs unless a migration is part of the task.
- Use the committed npm lockfile. Do not silently upgrade frameworks or invent
  databases, queues, providers or production infrastructure.
- Keep reusable starter fixes separate from business features. Consumers own
  their roles, tenant model, data storage and audit events.
- Write public documentation for all library users. Describe general contracts
  and integration requirements without personal project histories, private
  deployment details or assumptions about a particular user's infrastructure.
- Fix identified implementation/security defects within the authorized task;
  do not merely document them as future work. Preserve zero-vulnerability audit
  status and extend behavior tests when changing authentication/access controls.
- Keep examples and deployment instructions accurate. Label missing controls as
  gaps; a documented requirement is not an implemented feature.
- Run checks appropriate to the diff and report exact outcomes, existing
  failures and unverified live OAuth steps. Do not disable checks to pass builds.
- Keep runtime patch validation strict by default. Never enable
  `USERSAU_ALLOW_MANAGED_PATCH_LAG` automatically; it requires explicit operator
  acceptance of the documented runtime risk and removal after the provider's
  patch rollout. Local installs, builds and CI remain strict.
- Commit, push a feature branch, and create/update a PR for every changed repo.
  Deliver links, summary and verification; pushing alone is not completion.
  Preserve unrelated work and secrets.
- PR merge does not authorize deployment. Follow the target app's deployment
  rules only after explicit authorization.
