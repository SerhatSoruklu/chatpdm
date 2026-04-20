# ChatPDM Deploy Handoff

This folder contains the repo-native deployment skeleton for running ChatPDM on
the dedicated server under `/srv/chatpdm`.

The deployment model follows a structured release discipline adapted to
ChatPDM's Angular SSR runtime shape:

- frontend: Angular SSR web process managed by `pm2`
- backend: Express API process managed by `pm2`
- backend persistence: MongoDB on localhost
- deploy style: timestamped releases with a `current` symlink

## Target layout

```text
/srv/chatpdm/
  repo/
  releases/
  current -> /srv/chatpdm/releases/<timestamp>
  shared/
    backend.env.production
    frontend.env.production
```

Expected shared env split:

- `backend.env.production`
  - `NODE_ENV=production`
  - `HOST=127.0.0.1`
  - `PORT=4301`
  - `MONGODB_URI=...`
  - `CHATPDM_SIGNATURE_PRIVATE_KEY_FILE=/srv/chatpdm/shared/signature/private.pem` is optional if the deploy host already stores the private key at one of the conventional shared paths below
- `frontend.env.production`
  - `NODE_ENV=production`
  - `HOST=127.0.0.1`
  - `PORT=4101`
  - `API_BASE_URL=http://127.0.0.1:4301`

Conventional signature key locations searched by deploy when the backend env file does not set `CHATPDM_SIGNATURE_PRIVATE_KEY_FILE`:

- `/srv/chatpdm/shared/signature/private.pem`
- `/srv/chatpdm/shared/canonical-signature-private.pem`
- `/srv/chatpdm/shared/signature/canonical-signature-private.pem`
- `/srv/chatpdm/shared/chatpdm-signature-private.pem`

Deploy contract for shared env files:

- `backend.env.production` and `frontend.env.production` are manual-only, owner-controlled server files
- deploy reads these files but never creates, overwrites, patches, or infers them
- missing env files are a hard deploy failure, not something the deploy script repairs

## Expected ports

- frontend SSR: `4101`
- backend API: `4301`

`nginx` should proxy:

- `chatpdm.com` and `www.chatpdm.com` to the frontend SSR process on `127.0.0.1:4101`
- `/api/` and `/api` on `chatpdm.com` and `www.chatpdm.com` to the frontend SSR process on `127.0.0.1:4101`
- `/health` to the backend on `127.0.0.1:4301`
- `api.chatpdm.com` directly to the backend on `127.0.0.1:4301`

Recommended public host split:

- `chatpdm.com` and `www.chatpdm.com` for the frontend
- `api.chatpdm.com` for direct API access

Resolved incident note:

- status: resolved
- root cause: stale live nginx vhost on `chatpdm.com` still proxied `/api/` to the backend, colliding with the frontend docs route
- fix: remove the `/api/` backend proxy from `chatpdm.com` ingress and reload nginx
- `www.chatpdm.com` redirect behavior was left unchanged on purpose so the canonical host remains `chatpdm.com`

## Expected deploy flow

1. Update `/srv/chatpdm/repo` to the target branch.
2. Create a new timestamped release under `/srv/chatpdm/releases`.
3. Install backend dependencies with production-only modules.
4. Install frontend dependencies and build browser + server SSR artifacts.
5. Validate release artifacts.
6. Switch `/srv/chatpdm/current` to the new release.
7. Reload the frontend SSR and backend processes through `pm2`.
8. Run backend and frontend health checks.
9. Run public route verification for:
   - `https://chatpdm.com/api/`
   - `https://chatpdm.com/health`
   - `https://api.chatpdm.com/api/`
   - `https://www.chatpdm.com/api/`
10. Keep the release on success, or roll back on failure.

The public route verification step is intentionally strict:

- `https://chatpdm.com/api/` must return `200` and serve the frontend docs route
- the docs route must expose the stable identity marker `data-route-surface="api-docs"`
- `https://chatpdm.com/health` must return `200`
- `https://api.chatpdm.com/api/` must still resolve to the backend and return the backend's bounded `404` for `/api/`
- `https://www.chatpdm.com/api/` may return `301` or `302` to the canonical host and that is valid

Operational note:

- if the frontend marker change has not yet been deployed, live route verification will fail until the new release reaches production
- once deployed, `data-route-surface="api-docs"` is part of the required route contract
- `scripts/verify-public-routes.js --json` is available for CI or monitoring when structured output is preferred

The deploy script is safe to run repeatedly:

- repo code and release state are deploy-managed
- service reloads are deploy-managed
- env files are not deploy-managed
- the script may restart services even when the code delta is small, as long as the release and health checks complete safely

## GitHub automation model

Preferred model for the dedicated server:

- GitHub Actions workflow
- self-hosted runner on `coupyn-rbx`
- workflow runs the server-local deploy script directly

This avoids exposing a public SSH deploy path just for automation.

## Files in this folder

```text
deploy/
  nginx/
    chatpdm.conf.template
    chatpdm-api-not-found.html
  pm2/
    ecosystem.config.cjs
```

The actual deployment logic lives in:

```text
scripts/deploy-production.sh
```
