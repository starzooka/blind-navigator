import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { MOVE_COOLDOWN_MS, type Direction } from "shared";
import { socket } from "../lib/socket.js";
import { sound } from "../lib/sound.js";
import { HUD } from "../components/HUD.js";
import { useGameStore } from "../store/gameStore.js";
import styles from "./RunnerGame.module.css";

const signalIcons: Record<string, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  stop: "✋",
  danger: "!",
  good: "★"
};

const keyDirections: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right"
};

export function RunnerGame(): JSX.Element {
  const view = useGameStore((state) => state.runnerView);
  const roomCode = useGameStore((state) => state.roomCode);
  const lastSignal = useGameStore((state) => state.lastSignal);
  const blockedMoveCount = useGameStore((state) => state.blockedMoveCount);
  const [signalVisible, setSignalVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  const markerControls = useAnimation();
  const lastMoveAt = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const move = (direction: Direction): void => {
    if (!roomCode) {
      return;
    }
    const now = Date.now();
    if (now - lastMoveAt.current < MOVE_COOLDOWN_MS) {
      return;
    }
    lastMoveAt.current = now;
    socket.emit("runner:move", roomCode, direction);
    sound.play("step");
  };

  useEffect(() => {
    if (blockedMoveCount === 0 || reducedMotion) {
      return;
    }
    void markerControls.start({
      x: [0, -8, 8, -6, 6, 0],
      transition: { duration: 0.32 }
    });
  }, [blockedMoveCount, markerControls, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = keyDirections[
        event.key.length === 1 ? event.key.toLowerCase() : event.key
      ];
      if (!direction) {
        return;
      }
      event.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!lastSignal) {
      return;
    }
    setSignalVisible(true);
    const timeout = window.setTimeout(() => setSignalVisible(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [lastSignal]);

  if (!view) {
    return (
      <main className={styles.page}>
        <p>Loading game...</p>
      </main>
    );
  }

  const minX = Math.min(...view.visibleCells.map(({ pos }) => pos.x));
  const maxX = Math.max(...view.visibleCells.map(({ pos }) => pos.x));
  const minY = Math.min(...view.visibleCells.map(({ pos }) => pos.y));
  const maxY = Math.max(...view.visibleCells.map(({ pos }) => pos.y));
  const cellByPosition = new Map(
    view.visibleCells.map((visibleCell) => [
      `${visibleCell.pos.x},${visibleCell.pos.y}`,
      visibleCell
    ])
  );
  const gridCells = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const visibleCell = cellByPosition.get(`${x},${y}`);
      gridCells.push(
        <div
          className={visibleCell ? styles.cell : styles.darkCell}
          key={`${x}-${y}`}
          style={{
            borderTopColor: visibleCell?.cell.walls.up ? undefined : "transparent",
            borderRightColor: visibleCell?.cell.walls.right
              ? undefined
              : "transparent",
            borderBottomColor: visibleCell?.cell.walls.down
              ? undefined
              : "transparent",
            borderLeftColor: visibleCell?.cell.walls.left
              ? undefined
              : "transparent"
          }}
        >
          {x === view.position.x && y === view.position.y ? (
            <motion.span
              animate={markerControls}
              className={styles.runnerMarker}
              initial={false}
            />
          ) : null}
        </div>
      );
    }
  }

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>): void => {
    const touch = event.changedTouches[0];
    if (touch) {
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Runner view</p>
        <h1>Find the exit</h1>
      </header>
      <p className={styles.help}>Use the arrow keys or WASD to move.</p>
      <HUD />
      <div
        className={styles.viewport}
        onTouchEnd={onTouchEnd}
        onTouchStart={onTouchStart}
      >
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${maxX - minX + 1}, 56px)`,
            gridTemplateRows: `repeat(${maxY - minY + 1}, 56px)`
          }}
        >
          {gridCells}
        </div>
        {signalVisible && lastSignal ? (
          <motion.div
            animate={
              reducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.95] }
            }
            className={styles.signalOverlay}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.5 }}
          >
            {signalIcons[lastSignal]}
          </motion.div>
        ) : null}
      </div>
      <p className={styles.mobileHint}>Swipe to move</p>
    </main>
  );
}
