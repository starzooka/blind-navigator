import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "shared";

const playerTokenKey = "blind-navigator.player-token";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: TypedSocket = io(
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000",
  { autoConnect: false }
);

export function getPlayerToken(): string | null {
  return localStorage.getItem(playerTokenKey);
}

export function savePlayerToken(token: string): void {
  localStorage.setItem(playerTokenKey, token);
}
