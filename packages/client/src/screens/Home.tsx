import { useState, type FormEvent } from "react";
import { socket } from "../lib/socket.js";
import { useGameStore } from "../store/gameStore.js";
import styles from "./Home.module.css";

const roomCodePattern = /^[A-HJ-NP-Z]{4}$/;

export function Home(): JSX.Element {
  const [code, setCode] = useState("");
  const error = useGameStore((state) => state.error);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const setError = useGameStore((state) => state.setError);

  const createRoom = (): void => {
    setError("");
    socket.emit("room:create");
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!roomCodePattern.test(normalizedCode)) {
      setError("Enter a valid 4-letter room code.");
      return;
    }
    setError("");
    socket.emit("room:join", normalizedCode);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Blind Navigator</p>
        <h1>Find your way together.</h1>
        <p className={styles.subtitle}>
          One player sees the maze. The other finds the exit.
        </p>
        <button
          className={styles.primaryButton}
          disabled={connectionStatus !== "connected"}
          onClick={createRoom}
          type="button"
        >
          Create room
        </button>
        <div className={styles.divider}>
          <span>or join a room</span>
        </div>
        <form className={styles.joinForm} onSubmit={joinRoom}>
          <label htmlFor="room-code">Room code</label>
          <div className={styles.joinRow}>
            <input
              autoComplete="off"
              id="room-code"
              inputMode="text"
              maxLength={4}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABCD"
              spellCheck={false}
              value={code}
            />
            <button
              className={styles.secondaryButton}
              disabled={connectionStatus !== "connected"}
              type="submit"
            >
              Join
            </button>
          </div>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
