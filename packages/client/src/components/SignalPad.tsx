import { useEffect, useMemo, useState } from "react";
import { SIGNAL_COOLDOWN_MS, type SignalType } from "shared";
import { socket } from "../lib/socket.js";
import styles from "./SignalPad.module.css";

type SignalPadProps = {
  roomCode: string;
};

const signals: Array<{ type: SignalType; label: string; shortcut: string }> = [
  { type: "up", label: "Up", shortcut: "↑" },
  { type: "down", label: "Down", shortcut: "↓" },
  { type: "left", label: "Left", shortcut: "←" },
  { type: "right", label: "Right", shortcut: "→" },
  { type: "stop", label: "Stop", shortcut: "S" },
  { type: "danger", label: "Danger", shortcut: "D" },
  { type: "good", label: "Good", shortcut: "G" }
];

export function SignalPad({ roomCode }: SignalPadProps): JSX.Element {
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const cooldownRemaining = useMemo(
    () =>
      lastSentAt === null
        ? 0
        : Math.max(0, SIGNAL_COOLDOWN_MS - (now - lastSentAt)),
    [lastSentAt, now]
  );

  useEffect(() => {
    if (cooldownRemaining === 0) {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    const shortcuts = new Map<string, SignalType>([
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      ["s", "stop"],
      ["d", "danger"],
      ["g", "good"]
    ]);
    const onKeyDown = (event: KeyboardEvent): void => {
      const signal = shortcuts.get(
        event.key.length === 1 ? event.key.toLowerCase() : event.key
      );
      if (!signal) {
        return;
      }
      event.preventDefault();
      sendSignal(signal);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const sendSignal = (type: SignalType): void => {
    if (cooldownRemaining > 0) {
      return;
    }
    socket.emit("navigator:signal", roomCode, type);
    setLastSentAt(Date.now());
    setNow(Date.now());
  };

  return (
    <section aria-label="Signal pad" className={styles.pad}>
      <div className={styles.header}>
        <h2>Signal pad</h2>
        <span className={styles.cooldown}>
          {cooldownRemaining > 0
            ? `${(cooldownRemaining / 1000).toFixed(1)}s`
            : "Ready"}
        </span>
      </div>
      <div className={styles.buttons}>
        {signals.map((signal) => (
          <button
            className={`${styles.button} ${styles[signal.type]}`}
            disabled={cooldownRemaining > 0}
            key={signal.type}
            onClick={() => sendSignal(signal.type)}
            type="button"
          >
            <span>{signal.label}</span>
            <small>{signal.shortcut}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
