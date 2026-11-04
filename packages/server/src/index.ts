import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "shared";
import { registerGameHandlers } from "./handlers/game.js";
import { clearRoomTimer, emitRoomUpdate, registerRoomHandlers } from "./handlers/room.js";
import {
  RateLimiter,
  type HandlerContext,
  type TypedServer,
  type TypedSocket
} from "./handlers/types.js";
import type { RoundState } from "./game/engine.js";
import { RoomManager } from "./rooms.js";

export type RunningServer = {
  httpServer: ReturnType<typeof createServer>;
  io: TypedServer;
  close: () => Promise<void>;
};

export function createServerApp(): RunningServer {
  const httpServer = createServer();
  const io: TypedServer = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
        : "*"
    }
  });
  const rooms = new RoomManager();
  const rounds = new Map<string, RoundState>();
  const sockets = new Map<string, TypedSocket>();
  const roundTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const rateLimiter = new RateLimiter();
  let seed = 1;

  function createContext(): HandlerContext {
    return {
      io,
      rooms,
      rounds,
      sockets,
      roundTimers,
      now: () => Date.now(),
      nextSeed: () => seed++,
      rateLimiter
    };
  }

  io.on("connection", (socket) => {
    const context = createContext();
    socket.data.playerToken = randomBytes(24).toString("base64url");
    socket.emit("player:token", socket.data.playerToken);
    sockets.set(socket.id, socket);
    registerRoomHandlers(context, socket);
    registerGameHandlers(context, socket);
    socket.on("disconnect", () => {
      const code = socket.data.roomCode;
      if (code) {
        try {
          rooms.disconnectPlayer(code, socket.id, Date.now());
          emitRoomUpdate(context, code);
        } catch {
          clearRoomTimer(context, code);
          rounds.delete(code);
        }
      }
      sockets.delete(socket.id);
      rateLimiter.remove(socket.id);
    });
  });

  const cleanupInterval = setInterval(() => {
    for (const { code } of rooms.cleanupDisconnectedPlayers(Date.now())) {
      if (rooms.hasRoom(code)) {
        emitRoomUpdate(createContext(), code);
      } else {
        clearRoomTimer(createContext(), code);
        rounds.delete(code);
      }
    }
    for (const code of rooms.cleanupIdleRooms(Date.now())) {
      clearRoomTimer(createContext(), code);
      rounds.delete(code);
    }
  }, 30_000);
  cleanupInterval.unref();

  return {
    httpServer,
    io,
    close: async () => {
      clearInterval(cleanupInterval);
      for (const timer of roundTimers.values()) {
        clearTimeout(timer);
      }
      roundTimers.clear();
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  const app = createServerApp();
  const port = Number(process.env.PORT ?? 3000);
  app.httpServer.listen(port);
}
