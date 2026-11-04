import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "shared";

const playerTokenKey = "blind-navigator.player-token";
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: TypedSocket = io(
  SERVER_URL,
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 65_000
  }
);

export function getPlayerToken(): string | null {
  return localStorage.getItem(playerTokenKey);
}

export function savePlayerToken(token: string): void {
  localStorage.setItem(playerTokenKey, token);
}
