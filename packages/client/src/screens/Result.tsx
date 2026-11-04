import { socket } from "../lib/socket.js";
import { useGameStore } from "../store/gameStore.js";
import styles from "./Result.module.css";

export function Result(): JSX.Element {
  const result = useGameStore((state) => state.result);
  const roomCode = useGameStore((state) => state.roomCode);
  const resetForReplay = useGameStore((state) => state.resetForReplay);
  const opponentDisconnected = useGameStore(
    (state) => state.opponentDisconnected
  );

  const playAgain = (): void => {
    if (!roomCode) {
      return;
    }
    resetForReplay();
    socket.emit("player:ready", roomCode);
  };

  if (!result) {
    return <main className={styles.page}>Waiting for result...</main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Round complete</p>
        <h1 className={result.outcome === "win" ? styles.win : styles.lose}>
          {result.outcome === "win" ? "You made it!" : "Time ran out"}
        </h1>
        {opponentDisconnected ? (
          <p className={styles.warning}>Your teammate disconnected.</p>
        ) : null}
        <div className={styles.score}>{result.score.toLocaleString()}</div>
        <p className={styles.scoreLabel}>score</p>
        <dl className={styles.breakdown}>
          <div>
            <dt>Wrong moves</dt>
            <dd>{result.wrongMoves}</dd>
          </div>
          <div>
            <dt>Signals sent</dt>
            <dd>{result.signalsSent}</dd>
          </div>
        </dl>
        <button className={styles.button} onClick={playAgain} type="button">
          Play again
        </button>
      </section>
    </main>
  );
}
