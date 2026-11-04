import { create } from "zustand";
import type {
  NavigatorView,
  Difficulty,
  Phase,
  Role,
  RoundResult,
  RunnerView,
  RoomUpdate,
  SignalType
} from "shared";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type GameState = {
  connectionStatus: ConnectionStatus;
  roomCode: string | null;
  hostId: string | null;
  difficulty: Difficulty;
  players: RoomUpdate["players"];
  phase: Phase;
  myRole: Role | null;
  runnerView: RunnerView | null;
  navigatorView: NavigatorView | null;
  lastSignal: SignalType | null;
  result: RoundResult | null;
  error: string | null;
  blockedMoveCount: number;
  opponentDisconnected: boolean;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomUpdate: (update: RoomUpdate, socketId: string | undefined) => void;
  setRoundView: (view: NavigatorView | RunnerView) => void;
  setSignal: (signal: SignalType) => void;
  setResult: (result: RoundResult) => void;
  setError: (error: string) => void;
  incrementBlockedMove: () => void;
  resetForReplay: () => void;
};

function isNavigatorView(
  view: NavigatorView | RunnerView
): view is NavigatorView {
  return "maze" in view;
}

export const useGameStore = create<GameState>((set) => ({
  connectionStatus: "disconnected",
  roomCode: null,
  hostId: null,
  difficulty: "medium",
  players: [],
  phase: "lobby",
  myRole: null,
  runnerView: null,
  navigatorView: null,
  lastSignal: null,
  result: null,
  error: null,
  blockedMoveCount: 0,
  opponentDisconnected: false,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setRoomUpdate: (update, socketId) =>
    set((state) => {
      const activeRound = state.phase === "playing";
      const lobbyPlayer = update.players.find(
        (player) => player.id === socketId
      );
      return {
        roomCode: update.code,
        hostId: update.hostId,
        difficulty: update.difficulty,
        players: update.players,
        ...(activeRound
          ? {}
          : {
              phase: "lobby" as const,
              myRole: lobbyPlayer?.role ?? null
            }),
        opponentDisconnected: update.players.some(
          (player) => player.id !== socketId && !player.connected
        ),
        error: null
      };
    }),
  setRoundView: (view) =>
    set(
      isNavigatorView(view)
        ? {
            phase: "playing",
            myRole: "navigator",
            navigatorView: view,
            result: null
          }
        : {
            phase: "playing",
            myRole: "runner",
            runnerView: view,
            result: null
          }
    ),
  setSignal: (lastSignal) => set({ lastSignal }),
  setResult: (result) => set({ phase: "roundEnd", result }),
  setError: (error) => set({ error }),
  incrementBlockedMove: () =>
    set((state) => ({ blockedMoveCount: state.blockedMoveCount + 1 })),
  resetForReplay: () =>
    set({
      phase: "lobby",
      result: null,
      runnerView: null,
      navigatorView: null,
      lastSignal: null
    }),
}));

export type { GameState };
