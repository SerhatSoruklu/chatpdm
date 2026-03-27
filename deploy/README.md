# ChatPDM Deploy Handoff

This folder contains the repo-native deployment skeleton for running ChatPDM on
the dedicated server under `/srv/chatpdm`.

The deployment model follows the same release discipline as `4kapi`, but adapts
to ChatPDM's actual runtime shape:

- frontend: static Angular build served by `nginx`
- backend: Express API process managed by `pm2`
- deploy style: timestamped releases with a `current` symlink

## Target layout

```text
/srv/chatpdm/
  repo/
  releases/
  current -> /srv/chatpdm/releases/<timestamp>
  shared/
    backend.env.production
```

## Expected ports

- backend API: `4301`

`nginx` should proxy `/api/` and `/health` to the backend on `127.0.0.1:4301`.
The frontend should be served directly from:

```text
/srv/chatpdm/current/frontend/dist/frontend/browser
```

## Expected deploy flow

1. Update `/srv/chatpdm/repo` to the target branch.
2. Create a new timestamped release under `/srv/chatpdm/releases`.
3. Install backend dependencies with production-only modules.
4. Install frontend dependencies and build the static frontend.
5. Switch `/srv/chatpdm/current` to the new release.
6. Reload the backend process through `pm2`.
7. Run backend health checks.
8. Keep the release on success, or roll back on failure.

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
  pm2/
    ecosystem.config.cjs
```

The actual deployment logic lives in:

```text
scripts/deploy-production.sh
```
