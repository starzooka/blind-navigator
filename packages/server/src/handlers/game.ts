import {
  applyMove,
  applySignal,
  computeScore,
  expireRound
} from "../game/engine.js";
import { getNavigatorView, getRunnerView } from "../game/views.js";
import {
  acceptEvent,
  parsePayload,
  emitError,
  type HandlerContext,
  type TypedSocket
} from "./types.js";
import { directionSchema, roomCodeSchema, signalTypeSchema } from "shared";

function emitRoleViews(
  context: HandlerContext,
  code: string,
  event: "runner:moved",
  state: Parameters<typeof getRunnerView>[0]
): void {
  const room = context.rooms.getRoom(code);
  for (const player of room.players.values()) {
    const socket = context.sockets.get(player.id);
    if (!socket || !player.role) {
      continue;
    }
    socket.emit(
      event,
      player.role === "navigator" ? getNavigatorView(state) : getRunnerView(state)
    );
  }
}

export function endRound(
  context: HandlerContext,
  code: string,
  state: Parameters<typeof getRunnerView>[0]
): void {
  const timer = context.roundTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    context.roundTimers.delete(code);
  }
  const result = computeScore(state, context.now());
  if (!context.rooms.hasRoom(code)) {
    context.rounds.delete(code);
    return;
  }
  const room = context.rooms.getRoom(code);
  for (const player of room.players.values()) {
    context.sockets.get(player.id)?.emit("round:end", result);
  }
  context.rooms.resetReady(code);
  context.rounds.delete(code);
}

export function expireRoundAndEnd(context: HandlerContext, code: string): void {
  const state = context.rounds.get(code);
  if (!state) {
    const timer = context.roundTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      context.roundTimers.delete(code);
    }
    return;
  }
  if (!context.rooms.hasRoom(code)) {
    const timer = context.roundTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      context.roundTimers.delete(code);
    }
    context.rounds.delete(code);
    return;
  }
  const expired = expireRound(state, context.now());
  context.rounds.set(code, expired);
  if (expired.status !== "playing") {
    endRound(context, code, expired);
  }
}

export function registerGameHandlers(
  context: HandlerContext,
  socket: TypedSocket
): void {
  socket.on("runner:move", (code, direction) => {
    try {
      if (!acceptEvent(context, socket, "runner:move", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      const validDirection = parsePayload(socket, directionSchema, direction);
      if (!validCode || !validDirection) return;
      if (
        context.rounds.get(validCode)?.status !== "playing" ||
        socket.data.roomCode !== validCode ||
        socket.data.role !== "runner"
      ) {
        throw new Error("Only the runner may move");
      }
      const state = context.rounds.get(validCode);
      if (!state) {
        throw new Error("Round not found");
      }

      const result = applyMove(state, validDirection, context.now());
      context.rounds.set(validCode, result.state);
      if (result.result === "moved") {
        emitRoleViews(context, validCode, "runner:moved", result.state);
      }
      if (result.state.status !== "playing") {
        endRound(context, validCode, result.state);
      } else if (result.result !== "moved") {
        socket.emit("error", result.result);
      }
    } catch (error) {
      emitError(socket, error);
    }
  });

  socket.on("navigator:signal", (code, signalType) => {
    try {
      if (!acceptEvent(context, socket, "navigator:signal", context.now())) return;
      const validCode = parsePayload(socket, roomCodeSchema, code);
      const validSignal = parsePayload(socket, signalTypeSchema, signalType);
      if (!validCode || !validSignal) return;
      if (
        context.rounds.get(validCode)?.status !== "playing" ||
        socket.data.roomCode !== validCode ||
        socket.data.role !== "navigator"
      ) {
        throw new Error("Only the navigator may signal");
      }
      const state = context.rounds.get(validCode);
      if (!state) {
        throw new Error("Round not found");
      }

      const result = applySignal(state, validSignal, context.now());
      context.rounds.set(validCode, result.state);
      if (result.result === "sent") {
        const room = context.rooms.getRoom(validCode);
        const runner = [...room.players.values()].find(
          (player) => player.role === "runner"
        );
        if (runner) {
          context.sockets.get(runner.id)?.emit("signal:received", validSignal);
        }
      } else {
        socket.emit("error", result.result);
      }
    } catch (error) {
      emitError(socket, error);
    }
  });
}
