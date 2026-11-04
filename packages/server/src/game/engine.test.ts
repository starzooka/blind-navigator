import { describe, expect, it } from "vitest";
import { MOVE_COOLDOWN_MS, SIGNAL_COOLDOWN_MS } from "shared";
import {
  applyMove,
  applySignal,
  computeScore,
  createRound,
  type RoundState
} from "./engine.js";

function round(): RoundState {
  const state = createRound(1, 4, 1_000, 10_000, 3);
  return {
    ...state,
    maze: {
      width: 2,
      height: 1,
      cells: [
        [
          { walls: { up: true, down: true, left: true, right: false } },
          { walls: { up: true, down: true, left: false, right: true } }
        ]
      ]
    },
    start: { x: 0, y: 0 },
    runnerPos: { x: 0, y: 0 },
    exit: { x: 1, y: 0 },
    endsAt: 10_000,
    lastMoveAt: 1_000
  };
}

describe("applyMove", () => {
  it("rejects moves after the round is finished", () => {
    const state = { ...round(), status: "won" as const };

    expect(applyMove(state, "right", 2_000).result).toBe("finished");
    expect(state.runnerPos).toEqual({ x: 0, y: 0 });
  });

  describe("applySignal", () => {
    it("increments signalsSent and updates lastSignalAt", () => {
      const state = round();

      const result = applySignal(state, "good", 2_000);

      expect(result).toEqual({
        state: { ...state, signalsSent: 1, lastSignalAt: 2_000 },
        result: "sent"
      });
    });

    it("rejects signals inside the cooldown window", () => {
      const state = { ...round(), lastSignalAt: 2_000 };

      const result = applySignal(state, "danger", 2_000 + SIGNAL_COOLDOWN_MS - 1);

      expect(result.result).toBe("too_fast");
      expect(result.state).toEqual(state);
    });

    it("rejects signals after the round is finished", () => {
      const state = { ...round(), status: "lost" as const };

      expect(applySignal(state, "stop", 2_000)).toEqual({
        state,
        result: "finished"
      });
    });
  });

  describe("computeScore", () => {
    it("scores remaining time minus move and signal penalties", () => {
      const state = {
        ...round(),
        status: "won" as const,
        wrongMoves: 2,
        signalsSent: 3
      };

      expect(computeScore(state, 4_000)).toEqual({
        outcome: "win",
        wrongMoves: 2,
        signalsSent: 3,
        score: 5_725
      });
    });

    it("floors the score at zero and reports losses", () => {
      const state = {
        ...round(),
        status: "lost" as const,
        wrongMoves: 100,
        signalsSent: 100
      };

      expect(computeScore(state, 4_000)).toEqual({
        outcome: "lose",
        wrongMoves: 100,
        signalsSent: 100,
        score: 0
      });
    });
  });

  it("rejects moves inside the cooldown window", () => {
    const state = round();

    expect(applyMove(state, "right", 1_000 + MOVE_COOLDOWN_MS - 1).result).toBe(
      "too_fast"
    );
  });

  it("increments wrongMoves when a wall blocks movement", () => {
    const state = round();

    const result = applyMove(state, "up", 1_000 + MOVE_COOLDOWN_MS);

    expect(result.result).toBe("blocked");
    expect(result.state.wrongMoves).toBe(1);
    expect(result.state.runnerPos).toEqual({ x: 0, y: 0 });
  });

  it("moves the runner through an open passage", () => {
    const state = round();

    const result = applyMove(state, "right", 1_000 + MOVE_COOLDOWN_MS);

    expect(result.result).toBe("moved");
    expect(result.state.runnerPos).toEqual({ x: 1, y: 0 });
    expect(result.state.lastMoveAt).toBe(1_000 + MOVE_COOLDOWN_MS);
  });

  it("wins when the runner reaches the exit", () => {
    const result = applyMove(round(), "right", 1_000 + MOVE_COOLDOWN_MS);

    expect(result.state.status).toBe("won");
  });

  it("loses when the move happens at or after the deadline", () => {
    const state = round();
    state.endsAt = 1_150;

    const result = applyMove(state, "right", 1_150);

    expect(result.result).toBe("finished");
    expect(result.state.status).toBe("lost");
  });

  it("does not mutate the input state", () => {
    const state = round();
    const original = structuredClone(state);

    applyMove(state, "right", 1_000 + MOVE_COOLDOWN_MS);

    expect(state).toEqual(original);
  });
});
