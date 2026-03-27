# ChatPDM Backend

Express API for the ChatPDM workspace.

## Current Scope

- deterministic concept resolver
- feedback capture
- Mongo-backed backend persistence
- health endpoint with Mongo status
- CORS allowlist for ChatPDM frontend origins

## Run

```bash
npm install
npm run dev
```

Environment files:

- `backend/.env` for local development
- `backend/.env.production` as the production shape reference

The backend automatically loads:

- `.env` when `NODE_ENV` is not `production`
- `.env.production` when `NODE_ENV=production`

For local development, provide a reachable MongoDB instance through `MONGODB_URI`.

## Build Check

```bash
npm run build
```
