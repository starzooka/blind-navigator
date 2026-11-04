import type { Cell, Maze, Position } from "shared";
import { mulberry32 } from "./rng.js";

type Direction = "up" | "down" | "left" | "right";

interface StackCell {
  x: number;
  y: number;
}

const directions: Array<{
  direction: Direction;
  opposite: Direction;
  dx: number;
  dy: number;
}> = [
  { direction: "up", opposite: "down", dx: 0, dy: -1 },
  { direction: "down", opposite: "up", dx: 0, dy: 1 },
  { direction: "left", opposite: "right", dx: -1, dy: 0 },
  { direction: "right", opposite: "left", dx: 1, dy: 0 }
];

function createCell(): Cell {
  return {
    walls: {
      up: true,
      down: true,
      left: true,
      right: true
    }
  };
}

export function generateMaze(seed: number, width: number, height: number): Maze {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new RangeError("Maze dimensions must be positive integers");
  }

  const cells = Array.from({ length: height }, () =>
    Array.from({ length: width }, createCell)
  );
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const random = mulberry32(seed);
  const stack: StackCell[] = [{ x: 0, y: 0 }];
  const start = cells[0]?.[0];
  if (!start) {
    throw new Error("Unable to initialize maze");
  }
  const firstVisitedRow = visited[0];
  if (!firstVisitedRow) {
    throw new Error("Unable to initialize maze visitation state");
  }
  firstVisitedRow[0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    if (!current) {
      break;
    }

    const available = directions.filter(({ dx, dy }) => {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      return (
        nextX >= 0 &&
        nextX < width &&
        nextY >= 0 &&
        nextY < height &&
        !visited[nextY]?.[nextX]
      );
    });

    if (available.length === 0) {
      stack.pop();
      continue;
    }

    const choice = available[Math.floor(random() * available.length)];
    if (!choice) {
      continue;
    }
    const nextX = current.x + choice.dx;
    const nextY = current.y + choice.dy;
    const next = cells[nextY]?.[nextX];
    const cell = cells[current.y]?.[current.x];
    if (!next || !cell) {
      throw new Error("Unable to carve maze passage");
    }

    cell.walls[choice.direction] = false;
    next.walls[choice.opposite] = false;
    const visitedRow = visited[nextY];
    if (!visitedRow) {
      throw new Error("Unable to update maze visitation state");
    }
    visitedRow[nextX] = true;
    stack.push({ x: nextX, y: nextY });
  }

  return { width, height, cells };
}

export function pickStartAndExit(maze: Maze): { start: Position; exit: Position } {
  const start: Position = { x: 0, y: 0 };
  const queue: Array<{ position: Position; distance: number }> = [
    { position: start, distance: 0 }
  ];
  const visited = new Set<string>(["0,0"]);
  let farthest = start;
  let farthestDistance = 0;
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current) {
      continue;
    }

    if (current.distance > farthestDistance) {
      farthest = current.position;
      farthestDistance = current.distance;
    }

    const cell = maze.cells[current.position.y]?.[current.position.x];
    if (!cell) {
      throw new Error("Unable to read maze cell");
    }

    for (const { direction, dx, dy } of directions) {
      if (cell.walls[direction]) {
        continue;
      }

      const next: Position = {
        x: current.position.x + dx,
        y: current.position.y + dy
      };
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({ position: next, distance: current.distance + 1 });
    }
  }

  return { start, exit: farthest };
}
