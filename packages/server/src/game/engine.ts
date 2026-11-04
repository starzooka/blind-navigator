import { MOVE_COOLDOWN_MS, SIGNAL_COOLDOWN_MS } from "shared";
import type {
  Direction,
  Maze,
  Position,
  RoundResult,
  SignalType
} from "shared";
import { generateMaze, pickStartAndExit } from "./maze.js";

export type RoundState = {
  maze: Maze;
  start: Position;
  exit: Position;
  runnerPos: Position;
  wrongMoves: number;
  signalsSent: number;
  lives: number;
  startedAt: number;
  endsAt: number;
  lastMoveAt: number;
  lastSignalAt: number;
  status: "playing" | "won" | "lost";
};

export function createRound(
  seed: number,
  size: number,
  nowMs: number,
  durationMs: number,
  lives: number
): RoundState {
  const maze = generateMaze(seed, size, size);
  const { start, exit } = pickStartAndExit(maze);

  return {
    maze,
    start,
    exit,
    runnerPos: { ...start },
    wrongMoves: 0,
    signalsSent: 0,
    lives,
    startedAt: nowMs,
    endsAt: nowMs + durationMs,
    lastMoveAt: nowMs,
    lastSignalAt: nowMs,
    status: "playing"
  };
}

export function applyMove(
  state: RoundState,
  dir: Direction,
  nowMs: number
): { state: RoundState; result: "moved" | "blocked" | "too_fast" | "finished" } {
  if (state.status !== "playing") {
    return { state, result: "finished" };
  }

  if (nowMs >= state.endsAt) {
    return {
      state: { ...state, status: "lost" },
      result: "finished"
    };
  }

  if (nowMs - state.lastMoveAt < MOVE_COOLDOWN_MS) {
    return { state, result: "too_fast" };
  }

  const cell = state.maze.cells[state.runnerPos.y]?.[state.runnerPos.x];
  if (!cell || cell.walls[dir]) {
    return {
      state: {
        ...state,
        wrongMoves: state.wrongMoves + 1,
        lastMoveAt: nowMs
      },
      result: "blocked"
    };
  }

  const offsets: Record<Direction, Position> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const offset = offsets[dir];
  const runnerPos = {
    x: state.runnerPos.x + offset.x,
    y: state.runnerPos.y + offset.y
  };
  const nextState: RoundState = {
    ...state,
    runnerPos,
    lastMoveAt: nowMs
  };

  if (runnerPos.x === state.exit.x && runnerPos.y === state.exit.y) {
    nextState.status = "won";
  }

  return { state: nextState, result: "moved" };
}

export function applySignal(
  state: RoundState,
  _type: SignalType,
  nowMs: number
): { state: RoundState; result: "sent" | "too_fast" | "finished" } {
  if (state.status !== "playing") {
    return { state, result: "finished" };
  }

  if (nowMs - state.lastSignalAt < SIGNAL_COOLDOWN_MS) {
    return { state, result: "too_fast" };
  }

  return {
    state: {
      ...state,
      signalsSent: state.signalsSent + 1,
      lastSignalAt: nowMs
    },
    result: "sent"
  };
}

export function computeScore(state: RoundState, nowMs: number): RoundResult {
  const timeRemaining = Math.max(0, state.endsAt - nowMs);
  const score = Math.max(
    0,
    timeRemaining - state.wrongMoves * 100 - state.signalsSent * 25
  );

  return {
    outcome: state.status === "won" ? "win" : "lose",
    wrongMoves: state.wrongMoves,
    signalsSent: state.signalsSent,
    score
  };
}

export function expireRound(state: RoundState, nowMs: number): RoundState {
  if (state.status === "playing" && nowMs >= state.endsAt) {
    return { ...state, status: "lost" };
  }
  return state;
}
