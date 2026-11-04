import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Cell, Maze, Position } from "shared";
import styles from "./MazeGrid.module.css";

type MazeGridProps = {
  maze: Maze;
  runnerPos: Position;
  exit: Position;
  cellSize: number;
};

type MazeCellProps = {
  cell: Cell;
  x: number;
  y: number;
  cellSize: number;
};

const MazeCell = memo(function MazeCell({
  cell,
  x,
  y,
  cellSize
}: MazeCellProps): JSX.Element {
  return (
    <div
      className={styles.cell}
      style={{
        borderTopColor: cell.walls.up ? undefined : "transparent",
        borderRightColor: cell.walls.right ? undefined : "transparent",
        borderBottomColor: cell.walls.down ? undefined : "transparent",
        borderLeftColor: cell.walls.left ? undefined : "transparent",
        gridColumn: x + 1,
        gridRow: y + 1,
        height: cellSize,
        width: cellSize
      }}
    />
  );
});

export function MazeGrid({
  maze,
  runnerPos,
  exit,
  cellSize
}: MazeGridProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const cells = useMemo(
    () =>
      maze.cells.flatMap((row, y) =>
        row.map((cell, x) => (
          <MazeCell
            cell={cell}
            cellSize={cellSize}
            key={`${x}-${y}`}
            x={x}
            y={y}
          />
        ))
      ),
    [maze, cellSize]
  );

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${maze.width}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${maze.height}, ${cellSize}px)`,
        width: maze.width * cellSize,
        height: maze.height * cellSize
      }}
    >
      {cells}
      <div
        aria-label="Exit"
        className={styles.exit}
        style={{
          left: exit.x * cellSize,
          top: exit.y * cellSize,
          width: cellSize,
          height: cellSize
        }}
      />
      <motion.div
        aria-label="Runner"
        className={styles.runner}
        animate={{
          left: runnerPos.x * cellSize,
          top: runnerPos.y * cellSize
        }}
        initial={false}
        style={{
          width: cellSize,
          height: cellSize
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 500, damping: 30, mass: 0.45 }
        }
      >
        <span className={styles.runnerMarker} />
      </motion.div>
    </div>
  );
}
