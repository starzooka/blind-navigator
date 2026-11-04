import { createRound } from "../game/engine.js";
import { getNavigatorView, getRunnerView } from "../game/views.js";
import { expireRoundAndEnd } from "./game.js";
import {
  acceptEvent,
  parsePayload,
  emitError,
  roomUpdate,
  type HandlerContext,
  type TypedSocket
} from "./types.js";
import {
  difficultySchema,
  playerTokenSchema,
  roomCodeSchema,
  type Difficulty
} from "shared";

const difficultySettings: Record<Difficulty, { size: number; durationMs: number; lives: number }> = {
  small: { size: 8, durationMs: 60_000, lives: 4 },
  medium: { size: 12, durationMs: 90_000, lives: 3 },
  large: { size: 16, durationMs: 120_000, lives: 2 }
};

export function emitRoomUpdate(context: HandlerContext, code: string): void {
  const update = roomUpdate(code, context.rooms);
  for (const player of update.players) {
    context.sockets.get(player.id)?.emit("room:update", update);
  }
}

export function clearRoomTimer(context: HandlerContext, code: string): void {
  const timer = context.roundTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    context.roundTimers.delete(code);
  }
}

function emitCurrentRound(context: HandlerContext, socket: TypedSocket): void {
  const code = socket.data.roomCode;
  const role = socket.data.role;
  if (!code || !role) {
    return;
  }
  const round = context.rounds.get(code);
  if (!round) {
    return;
  }
  socket.emit(
    "round:start",
    role === "navigator" ? getNavigatorView(round) : getRunnerView(round)
  );
}

function startRound(context: HandlerContext, code: string): void {
  const room = context.rooms.getRoom(code);
  const players = context.rooms.assignRoles(code);
  const settings = difficultySettings[room.difficulty];
  const round = createRound(
    context.nextSeed(),
    settings.size,
    context.now(),
    settings.durationMs,
    settings.lives
  );
  const previousTimer = context.roundTimers.get(code);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  context.rounds.set(code, round);
  context.roundTimers.set(
    code,
    setTimeout(() => expireRoundAndEnd(context, code), round.endsAt - context.now())
  );

  for (const player of players) {
    const socket = context.sockets.get(player.id);
    if (!socket || !player.role) {
      continue;
    }

    socket.data.role = player.role;
    socket.emit(
      "round:start",
      player.role === "navigator"
        ? getNavigatorView(round)
        : getRunnerView(round)
    );
  }
  emitRoomUpdate(context, room.code);
}

export function registerRoomHandlers(
  context: HandlerContext,
  socket: TypedSocket
): void {
  socket.on("room:create", () => {
    try {
      if (!acceptEvent(context, socket, "room:create", context.now())) return;
      const playerToken = socket.data.playerToken;
      if (!playerToken) {
        throw new Error("Player token unavailable");
      }
      const room = context.rooms.createRoom(socket.id, context.now(), playerToken);
      socket.data.roomCode = room.code;
      void socket.join(room.code);
      context.sockets.set(socket.id, socket);
      emitRoomUpdate(context, room.code);
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("room:join", (code) => {
    try {
      if (!acceptEvent(context, socket, "room:join", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      if (!validCode) return;
      const playerToken = socket.data.playerToken;
      if (!playerToken) {
        throw new Error("Player token unavailable");
      }
      const room = context.rooms.joinRoom(
        validCode,
        socket.id,
        context.now(),
        playerToken
      );
      socket.data.roomCode = room.code;
      void socket.join(room.code);
      context.sockets.set(socket.id, socket);
      emitRoomUpdate(context, room.code);
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("room:difficulty", (code, difficulty) => {
    try {
      if (!acceptEvent(context, socket, "room:difficulty", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      const validDifficulty = parsePayload(socket, difficultySchema, difficulty);
      if (!validCode || !validDifficulty) return;
      if (context.rounds.has(validCode)) return;
      if (socket.data.roomCode !== validCode) {
        throw new Error("Player is not in this room");
      }
      context.rooms.setDifficulty(validCode, socket.id, validDifficulty);
      emitRoomUpdate(context, validCode);
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("room:reconnect", (code, playerToken) => {
    try {
      if (!acceptEvent(context, socket, "room:reconnect", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      const validToken = parsePayload(socket, playerTokenSchema, playerToken);
      if (!validCode || !validToken) return;
      const player = context.rooms.reconnectPlayer(
        validCode,
        validToken,
        socket.id,
        context.now()
      );
      socket.data.playerToken = validToken;
      socket.data.roomCode = validCode;
      if (player.role) {
        socket.data.role = player.role;
      }
      context.sockets.set(socket.id, socket);
      void socket.join(code);
      emitRoomUpdate(context, validCode);
      emitCurrentRound(context, socket);
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("player:ready", (code) => {
    try {
      if (!acceptEvent(context, socket, "player:ready", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      if (!validCode) return;
      if (context.rounds.has(validCode)) return;
      if (socket.data.roomCode !== validCode) {
        throw new Error("Player is not in this room");
      }
      const room = context.rooms.setReady(validCode, socket.id, context.now());
      emitRoomUpdate(context, room.code);
      if ([...room.players.values()].every((player) => player.ready)) {
        startRound(context, validCode);
      }
    } catch (error) {
      emitError(socket, error);
    }
  });
}
