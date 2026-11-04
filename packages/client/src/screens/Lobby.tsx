import { useState } from "react";
import { socket } from "../lib/socket.js";
import type { Difficulty } from "shared";
import { useGameStore } from "../store/gameStore.js";
import styles from "./Lobby.module.css";

export function Lobby(): JSX.Element {
  const roomCode = useGameStore((state) => state.roomCode);
  const players = useGameStore((state) => state.players);
  const error = useGameStore((state) => state.error);
  const difficulty = useGameStore((state) => state.difficulty);
  const hostId = useGameStore((state) => state.hostId);
  const [copied, setCopied] = useState(false);
  const isHost = hostId === socket.id;

  const copyRoomCode = async (): Promise<void> => {
    if (!roomCode) {
      return;
    }
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Waiting room</p>
        <h1>Invite your teammate</h1>
        <p className={styles.subtitle}>
          Share this code, then get ready when you are both here.
        </p>
        <div className={styles.codePanel}>
          <span className={styles.code}>{roomCode ?? "----"}</span>
          <button className={styles.copyButton} onClick={copyRoomCode} type="button">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <label className={styles.difficultyLabel} htmlFor="difficulty">
          Maze difficulty
        </label>
        <select
          className={styles.difficultySelect}
          disabled={!isHost}
          id="difficulty"
          onChange={(event) =>
            roomCode &&
            socket.emit(
              "room:difficulty",
              roomCode,
              event.target.value as Difficulty
            )
          }
          value={difficulty}
        >
          <option value="small">Small · 8×8 · 60s · 4 lives</option>
          <option value="medium">Medium · 12×12 · 90s · 3 lives</option>
          <option value="large">Large · 16×16 · 120s · 2 lives</option>
        </select>
        <div className={styles.players}>
          {players.map((player, index) => (
            <div className={styles.player} key={player.id}>
              <span className={styles.avatar}>{index + 1}</span>
              <span className={styles.playerName}>
                {player.id === socket.id ? "You" : `Player ${index + 1}`}
              </span>
              <span className={player.ready ? styles.ready : styles.waiting}>
                {player.ready ? "Ready" : "Waiting"}
              </span>
            </div>
          ))}
          {players.length < 2 ? (
            <div className={styles.emptySlot}>Waiting for another player...</div>
          ) : null}
        </div>
        {players.some((player) => player.id === socket.id && player.ready) ? (
          <button className={styles.readyButton} disabled type="button">
            Ready
          </button>
        ) : (
          <button
            className={styles.readyButton}
            disabled={!roomCode}
            onClick={() => roomCode && socket.emit("player:ready", roomCode)}
            type="button"
          >
            Ready
          </button>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
