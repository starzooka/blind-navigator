import { describe, expect, it } from "vitest";
import { FOG_RADIUS } from "shared";
import { createRound, type RoundState } from "./engine.js";
import { getNavigatorView, getRunnerView } from "./views.js";

function stateAtRunner(): RoundState {
  const state = createRound(1, 5, 1_000, 10_000, 3);
  return {
    ...state,
    runnerPos: { x: 2, y: 2 },
    exit: { x: 4, y: 4 }
  };
}

describe("getRunnerView", () => {
  it("only includes cells within the Manhattan fog radius", () => {
    const state = stateAtRunner();

    const view = getRunnerView(state);

    expect(
      view.visibleCells.every(
        ({ pos }) =>
          Math.abs(pos.x - state.runnerPos.x) +
            Math.abs(pos.y - state.runnerPos.y) <=
          FOG_RADIUS
      )
    ).toBe(true);
    expect(view.visibleCells).not.toContainEqual({
      pos: { x: 4, y: 4 },
      cell: state.maze.cells[4]?.[4]
    });
  });

  it("does not serialize distant cell data", () => {
    const state = stateAtRunner();
    const serialized = JSON.stringify(getRunnerView(state));

    expect(serialized).not.toContain(JSON.stringify(state.maze.cells[0]?.[0]));
    expect(serialized).not.toContain('"x":0,"y":0');
  });
});

describe("getNavigatorView", () => {
  it("includes the full maze", () => {
    const state = stateAtRunner();

    expect(getNavigatorView(state)).toEqual({
      maze: state.maze,
      exit: state.exit,
      runnerPos: state.runnerPos,
      endsAt: state.endsAt,
      lives: state.lives,
      signalsSent: state.signalsSent,
      wrongMoves: state.wrongMoves
    });
  });
});
