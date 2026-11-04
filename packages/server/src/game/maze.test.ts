import { describe, expect, it } from "vitest";
import type { Maze } from "shared";
import { generateMaze, pickStartAndExit } from "./maze.js";

function cellAt(maze: Maze, x: number, y: number) {
  const cell = maze.cells[y]?.[x];
  if (!cell) {
    throw new Error(`Missing cell at (${x}, ${y})`);
  }
  return cell;
}

function countOpenPassages(maze: Maze): number {
  let passages = 0;

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const cell = cellAt(maze, x, y);
      if (x + 1 < maze.width && !cell.walls.right) {
        passages += 1;
      }
      if (y + 1 < maze.height && !cell.walls.down) {
        passages += 1;
      }
    }
  }

  return passages;
}

function reachablePositions(maze: Maze): Set<string> {
  const reachable = new Set<string>();
  const pending: Array<[number, number]> = [[0, 0]];

  while (pending.length > 0) {
    const position = pending.pop();
    if (!position) {
      continue;
    }

    const [x, y] = position;
    const key = `${x},${y}`;
    if (reachable.has(key)) {
      continue;
    }
    reachable.add(key);

    const cell = cellAt(maze, x, y);
    if (x > 0 && !cell.walls.left) {
      pending.push([x - 1, y]);
    }
    if (x + 1 < maze.width && !cell.walls.right) {
      pending.push([x + 1, y]);
    }
    if (y > 0 && !cell.walls.up) {
      pending.push([x, y - 1]);
    }
    if (y + 1 < maze.height && !cell.walls.down) {
      pending.push([x, y + 1]);
    }
  }

  return reachable;
}

describe("generateMaze", () => {
  it("generates an identical maze for the same seed", () => {
    expect(generateMaze(1, 10, 8)).toEqual(generateMaze(1, 10, 8));
  });

  describe("pickStartAndExit", () => {
    it("returns an exit reachable from the start", () => {
      const maze = generateMaze(1, 12, 9);
      const { start, exit } = pickStartAndExit(maze);

      expect(start).toEqual({ x: 0, y: 0 });
      expect(reachablePositions(maze)).toContain(`${exit.x},${exit.y}`);
    });

    it("returns an exit different from the start", () => {
      const maze = generateMaze(1, 12, 9);
      const { start, exit } = pickStartAndExit(maze);

      expect(exit).not.toEqual(start);
    });

    it("is deterministic for the same maze", () => {
      const maze = generateMaze(1, 12, 9);

      expect(pickStartAndExit(maze)).toEqual(pickStartAndExit(maze));
    });
  });

  it("generates different mazes for different seeds", () => {
    expect(generateMaze(1, 10, 8)).not.toEqual(
      generateMaze(2, 10, 8)
    );
  });

  it("has the requested dimensions", () => {
    const maze = generateMaze(1, 7, 5);

    expect(maze.width).toBe(7);
    expect(maze.height).toBe(5);
    expect(maze.cells).toHaveLength(5);
    expect(maze.cells.every((row) => row.length === 7)).toBe(true);
  });

  it("makes every cell reachable from (0, 0)", () => {
    const maze = generateMaze(1, 12, 9);

    expect(reachablePositions(maze)).toHaveLength(12 * 9);
  });

  it("is perfect, with exactly one fewer passage than cells", () => {
    const width = 12;
    const height = 9;
    const maze = generateMaze(1, width, height);

    expect(countOpenPassages(maze)).toBe(width * height - 1);
  });

  it("keeps walls consistent between neighboring cells", () => {
    const maze = generateMaze(1, 12, 9);

    for (let y = 0; y < maze.height; y += 1) {
      for (let x = 0; x < maze.width; x += 1) {
        const cell = cellAt(maze, x, y);
        if (x + 1 < maze.width) {
          expect(cell.walls.right).toBe(cellAt(maze, x + 1, y).walls.left);
        }
        if (y + 1 < maze.height) {
          expect(cell.walls.down).toBe(cellAt(maze, x, y + 1).walls.up);
        }
      }
    }
  });

  it("has outer walls on every border cell", () => {
    const maze = generateMaze(1, 12, 9);

    for (let y = 0; y < maze.height; y += 1) {
      expect(cellAt(maze, 0, y).walls.left).toBe(true);
      expect(cellAt(maze, maze.width - 1, y).walls.right).toBe(true);
    }
    for (let x = 0; x < maze.width; x += 1) {
      expect(cellAt(maze, x, 0).walls.up).toBe(true);
      expect(cellAt(maze, x, maze.height - 1).walls.down).toBe(true);
    }
  });
});
