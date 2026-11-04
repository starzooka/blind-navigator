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
`CLIENT_ORIGIN`. Set `CLIENT_ORIGIN` to one origin or a comma-separated list:

```text
CLIENT_ORIGIN=https://blind-navigator.vercel.app
```

See [DEPLOY.md](./DEPLOY.md) for the exact Render and Vercel settings and
deployment order.
