import { MazeGrid } from "../components/MazeGrid.js";
import { SignalPad } from "../components/SignalPad.js";
import { HUD } from "../components/HUD.js";
import { useGameStore } from "../store/gameStore.js";
import styles from "./NavigatorGame.module.css";

export function NavigatorGame(): JSX.Element {
  const view = useGameStore((state) => state.navigatorView);
  const roomCode = useGameStore((state) => state.roomCode);

  if (!view || !roomCode) {
    return (
      <main className={styles.page}>
        <p>Loading game...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Navigator view</p>
          <h1>Guide the runner</h1>
        </div>
        <span className={styles.room}>Room {roomCode}</span>
      </header>
      <HUD />
      <section className={styles.mazePanel}>
        <MazeGrid
          cellSize={42}
          exit={view.exit}
          maze={view.maze}
          runnerPos={view.runnerPos}
        />
      </section>
      <SignalPad roomCode={roomCode} />
    </main>
  );
}
