import { useEffect } from "react";
import { socket } from "./lib/socket.js";
import { useSocketEvents } from "./hooks/useSocketEvents.js";
import { Home } from "./screens/Home.js";
import { Lobby } from "./screens/Lobby.js";
import { NavigatorGame } from "./screens/NavigatorGame.js";
import { RunnerGame } from "./screens/RunnerGame.js";
import { Result } from "./screens/Result.js";
import { useGameStore } from "./store/gameStore.js";

export function App(): JSX.Element {
  useSocketEvents();
  const phase = useGameStore((state) => state.phase);
  const roomCode = useGameStore((state) => state.roomCode);
  const myRole = useGameStore((state) => state.myRole);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  if (phase === "lobby" && roomCode) {
    return <Lobby />;
  }
  if (phase === "playing" && myRole === "navigator") {
    return <NavigatorGame />;
  }
  if (phase === "playing" && myRole === "runner") {
    return <RunnerGame />;
  }
  if (phase === "roundEnd") {
    return <Result />;
  }

  return <Home />;
}
