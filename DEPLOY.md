# Deployment

This repository is an npm workspace monorepo. Deploy the server as a Render
Node web service and the client as a Vercel project.

## Required environment variables

### Render server

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `20` |
| `CLIENT_ORIGIN` | The deployed Vercel origin, without a trailing slash |

Render supplies `PORT` automatically. The server defaults to port `3000` for
local development.

### Vercel client

| Variable | Value |
| --- | --- |
| `VITE_SERVER_URL` | The public Render service URL, without a trailing slash |

## Render dashboard settings

Create a new **Web Service** from this repository and use:

| Field | Value |
| --- | --- |
| Name | `blind-navigator-server` |
| Runtime | `Node` |
| Branch | Your deployment branch |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm install --include=dev && npm run build -w shared && npm run build -w server` |
| Start Command | `npm start -w server` |
| Plan | `Free` |
| Health Check Path | `/health` |

Add `NODE_VERSION=20` and `CLIENT_ORIGIN` in the Environment Variables section.
Leave `PORT` unset so Render can provide it.

## Vercel dashboard settings

Import the same repository as a new project and use:

| Field | Value |
| --- | --- |
| Root Directory | `packages/client` |
| Framework Preset | `Vite` |
| Install Command | `cd .. && npm install` |
| Build Command | `cd .. && npm run build -w shared && npm run build -w client` |
| Output Directory | `dist` |

Add `VITE_SERVER_URL` with the public Render service URL. Set it for the
Production environment (and Preview if previews should use the same server).

## Order of operations

1. Deploy the Render server.
2. Copy the Render service URL into Vercel as `VITE_SERVER_URL`.
3. Deploy the Vercel client.
4. Copy the Vercel production URL into Render as `CLIENT_ORIGIN`.
5. Redeploy the Render service so the CORS setting is active.
6. If `VITE_SERVER_URL` changes, update it in Vercel and redeploy the client.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Render deployment fails during build | Confirm the root directory is blank and the build command runs from the repository root. |
| Render health check fails | Open `<render-url>/health`; it must return `ok`, and confirm the service is listening on Render's `PORT`. |
| Browser reports a CORS error | Set `CLIENT_ORIGIN` to the exact Vercel origin without a trailing slash, then redeploy Render. |
| Client connects to localhost in production | Set `VITE_SERVER_URL` in Vercel and redeploy; Vite variables are compiled into the client. |
| Free service is slow on first connection | Wait for Render cold start; the client health request and extended Socket.IO timeout allow up to a minute. |
| Rooms disappear | The server stores rooms in memory; restarts and free-service sleep discard active rooms. |
