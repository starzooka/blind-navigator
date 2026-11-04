# Blind Navigator

Blind Navigator is a cooperative Socket.IO game. The navigator sees the maze
and guides the runner, who moves through a limited fog-of-war view.

## Requirements

- Node.js 22+
- npm 10+

Install dependencies from the repository root:

```bash
npm ci
```

## Scripts

```bash
npm run dev:client       # Start the Vite client
npm run dev:server       # Start the Socket.IO server with watch mode
npm run build:client     # Production client build
npm run build:server     # Build shared types and the server
npm test                 # Run tests
npm run lint             # Run ESLint
npm run start:server     # Start the compiled server
```

The client uses `VITE_SERVER_URL` for the Socket.IO server URL. The server
listens on `PORT` (default `3000`) and accepts browser origins through
`CORS_ORIGIN`. Set `CORS_ORIGIN` to one origin or a comma-separated list:

```text
CORS_ORIGIN=https://blind-navigator.vercel.app
```

## Deploy the client to Vercel

1. Import the repository into Vercel.
2. Set the project root to `packages/client`.
3. Use `npm run build --workspace client` as the build command, or run
   `npm run build` from the client root.
4. Set the output directory to `dist`.
5. Add `VITE_SERVER_URL` with the public Render URL, for example
   `https://blind-navigator-server.onrender.com`.
6. Deploy and copy the resulting Vercel URL into the server's `CORS_ORIGIN`.

## Deploy the server to Render

Using the Dockerfile:

1. Create a new Render Web Service from this repository.
2. Select Docker as the runtime and keep the repository root as the Docker
   context.
3. Set `CORS_ORIGIN` to the deployed Vercel URL. Set `NODE_ENV=production`.
4. Render supplies `PORT`; the container exposes port `3000`.
5. Deploy and use the service URL as the client's `VITE_SERVER_URL`.

For a native Node Render service instead, use:

- Build command: `npm run build:server`
- Start command: `npm run start:server`

The server is in-memory: active rooms and rounds are lost when the service
restarts or scales horizontally. Use a single instance unless shared
persistence and coordination are added.
