import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "shared";
import type { DefaultEventsMap, Server, Socket } from "socket.io";
import type { RoomManager } from "../rooms.js";
import type { RoundState } from "../game/engine.js";

export type SocketData = {
  playerToken?: string;
  roomCode?: string;
  role?: "navigator" | "runner";
};

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;

export type HandlerContext = {
  io: TypedServer;
  rooms: RoomManager;
  rounds: Map<string, RoundState>;
  sockets: Map<string, TypedSocket>;
  roundTimers: Map<string, ReturnType<typeof setTimeout>>;
  now: () => number;
  nextSeed: () => number;
  rateLimiter: RateLimiter;
};

export class RateLimiter {
  private readonly attempts = new Map<string, number[]>();

  consume(key: string, limit: number, windowMs: number, nowMs: number): boolean {
    const recent = (this.attempts.get(key) ?? []).filter(
      (timestamp) => nowMs - timestamp < windowMs
    );
    if (recent.length >= limit) {
      this.attempts.set(key, recent);
      return false;
    }
    recent.push(nowMs);
    this.attempts.set(key, recent);
    return true;
  }

  remove(key: string): void {
    this.attempts.delete(key);
  }
}

export function acceptEvent(
  context: HandlerContext,
  socket: TypedSocket,
  event: string,
  nowMs: number
): boolean {
  const limit = event === "runner:move" ? 100 : event === "navigator:signal" ? 20 : 10;
  const windowMs = event === "runner:move" ? 10_000 : 10_000;
  if (!context.rateLimiter.consume(`${socket.id}:${event}`, limit, windowMs, nowMs)) {
    emitError(socket, new Error("Rate limit exceeded"));
    return false;
  }
  return true;
}

export function parsePayload<T>(
  socket: TypedSocket,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  value: unknown
): T | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    emitError(socket, new Error("Invalid payload"));
    return undefined;
  }
  return parsed.data;
}

export function roomUpdate(code: string, rooms: RoomManager) {
  const room = rooms.getRoom(code);
  return {
    code: room.code,
    hostId: room.hostId,
    difficulty: room.difficulty,
    players: [...room.players.values()].map(({ id, ready, role, connected }) => ({
      id,
      ready,
      connected,
      ...(role ? { role } : {})
    }))
  };
}

export function emitError(socket: TypedSocket, error: unknown): void {
  socket.emit("error", error instanceof Error ? error.message : "Request failed");
}
