# Blind Navigator Project Guidelines

## Architecture

- The server is authoritative. Clients must never receive hidden maze data; the runner receives only cells within the fog radius.
- Game engine code in `server/src/game` must use pure functions: no I/O, sockets, `Date.now()`, or `Math.random()`. Pass time and seed values as inputs instead.
- All socket events must use the typed interfaces from `shared/src/types.ts`.

## Code Style

- Use strict TypeScript.
- Do not use `any` or non-null assertions.
- Prefer small functions and descriptive names.
- Do not add unnecessary comments.

## Testing

- Tests live beside the code they test as `*.test.ts` files and use Vitest.
