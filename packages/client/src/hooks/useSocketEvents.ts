import { useEffect } from "react";
import { getPlayerToken, savePlayerToken, socket } from "../lib/socket.js";
import { sound } from "../lib/sound.js";
import { useGameStore } from "../store/gameStore.js";

export function useSocketEvents(): void {
  const setConnectionStatus = useGameStore(
    (state) => state.setConnectionStatus
  );
  const setRoomUpdate = useGameStore((state) => state.setRoomUpdate);
  const setRoundView = useGameStore((state) => state.setRoundView);
  const setSignal = useGameStore((state) => state.setSignal);
  const setResult = useGameStore((state) => state.setResult);
  const setError = useGameStore((state) => state.setError);
  const incrementBlockedMove = useGameStore(
    (state) => state.incrementBlockedMove
  );

  useEffect(() => {
    const onConnect = (): void => {
      setConnectionStatus("connected");
      const token = getPlayerToken();
      if (token) {
        const roomCode = useGameStore.getState().roomCode;
        if (roomCode) {
          socket.emit("room:reconnect", roomCode, token);
        }
      }
    };
    const onDisconnect = (): void => setConnectionStatus("disconnected");
    const onConnectError = (error: Error): void => {
      setConnectionStatus("disconnected");
      setError(error.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("player:token", savePlayerToken);
    socket.on("room:update", (update) => {
      setRoomUpdate(update, socket.id);
      console.log("room:update", {
        phase: useGameStore.getState().phase
      });
    });
    socket.on("round:start", (view) => {
      setRoundView(view);
      console.log("round:start", {
        phase: useGameStore.getState().phase
      });
    });
    socket.on("runner:moved", (view) => {
      setRoundView(view);
      console.log("runner:moved", {
        phase: useGameStore.getState().phase
      });
    });
    socket.on("signal:received", (signal) => {
      setSignal(signal);
      sound.play("signal");
      console.log("signal:received", {
        phase: useGameStore.getState().phase
      });
    });
    socket.on("round:end", (result) => {
      setResult(result);
      sound.play(result.outcome === "win" ? "win" : "lose");
      console.log("round:end", {
        phase: useGameStore.getState().phase
      });
    });
    socket.on("error", (message) => {
      setError(message);
      if (message === "blocked") {
        incrementBlockedMove();
        sound.play("bump");
      }
      console.log("error", {
        phase: useGameStore.getState().phase
      });
    });

    setConnectionStatus(socket.connected ? "connected" : "disconnected");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("player:token", savePlayerToken);
      socket.off("room:update");
      socket.off("round:start", setRoundView);
      socket.off("runner:moved", setRoundView);
      socket.off("signal:received", setSignal);
      socket.off("round:end", setResult);
      socket.off("error");
    };
  }, [
    setConnectionStatus,
    setError,
    setResult,
    setRoomUpdate,
    setRoundView,
    setSignal,
    incrementBlockedMove
  ]);
}
