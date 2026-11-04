import { useEffect, useState } from "react";
import styles from "./HUD.module.css";
import { useGameStore } from "../store/gameStore.js";

export function HUD(): JSX.Element {
  const role = useGameStore((state) => state.myRole);
  const runnerView = useGameStore((state) => state.runnerView);
  const navigatorView = useGameStore((state) => state.navigatorView);
  const opponentDisconnected = useGameStore(
    (state) => state.opponentDisconnected
  );
  const view = role === "runner" ? runnerView : navigatorView;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  if (!view) {
    return <div className={styles.hud} />;
  }

  const remaining = Math.max(0, view.endsAt - now);
  const seconds = Math.ceil(remaining / 1000);

  return (
    <section className={styles.hud} aria-label="Game status">
      <div className={styles.timer}>{`${Math.floor(seconds / 60)}:${String(
        seconds % 60
      ).padStart(2, "0")}`}</div>
      <div className={styles.stats}>
        <span>♥ {view.lives}</span>
        <span>Signals {view.signalsSent}</span>
        <span>Wrong moves {view.wrongMoves}</span>
      </div>
      {opponentDisconnected ? (
        <p className={styles.warning}>Your teammate disconnected.</p>
      ) : null}
    </section>
  );
}
