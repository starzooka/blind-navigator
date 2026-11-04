import { afterEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  Direction,
  NavigatorView,
  RoundResult,
  RunnerView,
  ServerToClientEvents
} from "shared";
import { createServerApp, type RunningServer } from "./index.js";

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const clients: TestClient[] = [];
let app: RunningServer | undefined;

function waitFor<T extends keyof ServerToClientEvents>(
  socket: TestClient,
  event: T,
  label = event
): Promise<Parameters<ServerToClientEvents[T]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${label}`)),
      30_000
    );
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connectClient(port: number): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const socket = connect(`http://localhost:${port}`, {
      autoConnect: true
    });
    clients.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function findPath(view: NavigatorView): Direction[] {
  const queue: Array<{ x: number; y: number }> = [view.runnerPos];
  const visited = new Set([`${view.runnerPos.x},${view.runnerPos.y}`]);
  const previous = new Map<
    string,
    { key: string; direction: Direction }
  >();
  const directions: Array<{
    direction: Direction;
    dx: number;
    dy: number;
    wall: "up" | "down" | "left" | "right";
  }> = [
    { direction: "up", dx: 0, dy: -1, wall: "up" },
    { direction: "down", dx: 0, dy: 1, wall: "down" },
    { direction: "left", dx: -1, dy: 0, wall: "left" },
    { direction: "right", dx: 1, dy: 0, wall: "right" }
  ];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) {
      continue;
    }
    if (current.x === view.exit.x && current.y === view.exit.y) {
      break;
    }
    const cell = view.maze.cells[current.y]?.[current.x];
    if (!cell) {
      throw new Error("Navigator view omitted a maze cell");
    }

    for (const step of directions) {
      if (cell.walls[step.wall]) {
        continue;
      }
      const next = { x: current.x + step.dx, y: current.y + step.dy };
      const nextKey = `${next.x},${next.y}`;
      if (visited.has(nextKey)) {
        continue;
      }
      visited.add(nextKey);
      previous.set(nextKey, {
        key: `${current.x},${current.y}`,
        direction: step.direction
      });
      queue.push(next);
    }
  }

  const path: Direction[] = [];
  let key = `${view.exit.x},${view.exit.y}`;
  const startKey = `${view.runnerPos.x},${view.runnerPos.y}`;
  while (key !== startKey) {
    const step = previous.get(key);
    if (!step) {
      throw new Error("Exit is unreachable from runner position");
    }
    path.unshift(step.direction);
    key = step.key;
  }
  return path;
}

describe("server integration", () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.close();
    }
    await app?.close();
    app = undefined;
  });

  it(
    "plays a complete game and keeps the full maze from the runner",
    async () => {
      app = createServerApp();
      await new Promise<void>((resolve) => {
        app?.httpServer.listen(0, () => resolve());
      });
      const address = app.httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Server did not expose a TCP address");
      }

      const host = await connectClient(address.port);
      const guest = await connectClient(address.port);

      const hostRoom = waitFor(host, "room:update");
      host.emit("room:create");
      const room = await hostRoom;

      const guestRoom = waitFor(guest, "room:update");
      guest.emit("room:join", room.code);
      await guestRoom;

      const hostRound = waitFor(host, "round:start");
      const guestRound = waitFor(guest, "round:start");
      host.emit("player:ready", room.code);
      guest.emit("player:ready", room.code);
      const [hostView, guestView] = await Promise.all([hostRound, guestRound]);

      const navigatorView =
        "maze" in hostView ? hostView : ("maze" in guestView ? guestView : undefined);
      const runner = "maze" in hostView ? guest : host;
      const runnerView = "maze" in hostView ? guestView : hostView;
      if (!navigatorView || "maze" in runnerView) {
        throw new Error("Clients did not receive role-specific views");
      }
      expect((runnerView as RunnerView).visibleCells).toBeDefined();
      expect(JSON.stringify(runnerView)).not.toContain(
        JSON.stringify(navigatorView.maze)
      );

      const resultPromise = waitFor(runner, "round:end");
      const errors: string[] = [];
      runner.on("error", (message) => errors.push(message));
      await new Promise((resolve) => setTimeout(resolve, 160));
      for (const direction of findPath(navigatorView)) {
        const moved = waitFor(runner, "runner:moved");
        runner.emit("runner:move", room.code, direction);
        await moved;
        await new Promise((resolve) => setTimeout(resolve, 160));
      }

      const result = (await resultPromise) as RoundResult;
      expect(errors).toEqual([]);
      expect(result.outcome).toBe("win");
    },
    30_000
  );
});
