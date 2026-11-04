import { FOG_RADIUS } from "shared";
import type { NavigatorView, RunnerView } from "shared";
import type { RoundState } from "./engine.js";

export function getRunnerView(state: RoundState): RunnerView {
  const visibleCells: RunnerView["visibleCells"] = [];

  for (let y = 0; y < state.maze.height; y += 1) {
    for (let x = 0; x < state.maze.width; x += 1) {
      if (
        Math.abs(x - state.runnerPos.x) + Math.abs(y - state.runnerPos.y) >
        FOG_RADIUS
      ) {
        continue;
      }

      const cell = state.maze.cells[y]?.[x];
      if (!cell) {
        throw new Error(`Missing maze cell at (${x}, ${y})`);
      }
      visibleCells.push({
        pos: { x, y },
        cell
      });
    }
  }

  return {
    position: { ...state.runnerPos },
    visibleCells,
    radius: FOG_RADIUS,
    endsAt: state.endsAt,
    lives: state.lives,
    signalsSent: state.signalsSent,
    wrongMoves: state.wrongMoves
  };
}

export function getNavigatorView(state: RoundState): NavigatorView {
  return {
    maze: state.maze,
    exit: { ...state.exit },
    runnerPos: { ...state.runnerPos },
    endsAt: state.endsAt,
    lives: state.lives,
    signalsSent: state.signalsSent,
    wrongMoves: state.wrongMoves
  };
}
