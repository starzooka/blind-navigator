import {
  RECONNECT_GRACE_MS,
  ROOM_CODE_LENGTH
} from "shared";
import { randomInt } from "node:crypto";
import type { Difficulty, Role } from "shared";

export type RoomPlayer = {
  id: string;
  token: string;
  ready: boolean;
  role?: Role;
  connected: boolean;
  disconnectedAt?: number;
};

export type Room = {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  createdAt: number;
  lastActivityAt: number;
  difficulty: Difficulty;
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  createRoom(hostId: string, nowMs: number, token = hostId): Room {
    let code = this.generateCode();
    while (this.rooms.has(code)) {
      code = this.generateCode();
    }

    const room: Room = {
      code,
      hostId,
      difficulty: "medium",
      players: new Map([
        [hostId, { id: hostId, token, ready: false, connected: true }]
      ]),
      createdAt: nowMs,
      lastActivityAt: nowMs
    };
    this.rooms.set(code, room);
    return room;
  }

  setDifficulty(code: string, playerId: string, difficulty: Difficulty): Room {
    const room = this.getRoomOrThrow(code);
    if (room.hostId !== playerId) {
      throw new Error("Only the host can change difficulty");
    }
    if (room.players.size > 1 && [...room.players.values()].some((player) => player.ready)) {
      throw new Error("Cannot change difficulty after a player is ready");
    }
    room.difficulty = difficulty;
    return room;
  }

  joinRoom(code: string, playerId: string, nowMs = 0, token = playerId): Room {
    const room = this.getRoomOrThrow(code);
    if (room.players.size >= 2 && !room.players.has(playerId)) {
      throw new Error("Room is full");
    }

    room.players.set(playerId, {
      id: playerId,
      token,
      ready: false,
      connected: true
    });
    room.lastActivityAt = nowMs;
    return room;
  }

  setReady(code: string, playerId: string, nowMs = 0): Room {
    const room = this.getRoomOrThrow(code);
    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    player.ready = true;
    room.lastActivityAt = nowMs;
    return room;
  }

  resetReady(code: string): Room {
    const room = this.getRoomOrThrow(code);
    for (const player of room.players.values()) {
      player.ready = false;
    }
    return room;
  }

  assignRoles(code: string): RoomPlayer[] {
    const room = this.getRoomOrThrow(code);
    if (room.players.size !== 2) {
      throw new Error("Room requires two players");
    }

    const players = [...room.players.values()];
    const previousRoles = players.map((player) => player.role);
    const shouldSwap =
      previousRoles[0] !== undefined && previousRoles[1] !== undefined;
    const navigatorIndex = shouldSwap
      ? previousRoles.findIndex((role) => role === "runner")
      : Math.floor(Math.random() * players.length);

    players.forEach((player, index) => {
      player.role = index === navigatorIndex ? "navigator" : "runner";
    });
    return players;
  }

  removePlayer(code: string, playerId: string, nowMs = 0): Room | undefined {
    const room = this.getRoomOrThrow(code);
    room.players.delete(playerId);
    room.lastActivityAt = nowMs;
    if (room.players.size === 0) {
      this.rooms.delete(code);
      return undefined;
    }
    return room;
  }

  disconnectPlayer(code: string, playerId: string, nowMs: number): Room {
    const room = this.getRoomOrThrow(code);
    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    player.connected = false;
    player.disconnectedAt = nowMs;
    room.lastActivityAt = nowMs;
    return room;
  }

  reconnectPlayer(
    code: string,
    token: string,
    playerId: string,
    nowMs: number
  ): RoomPlayer {
    const room = this.getRoomOrThrow(code);
    const player = [...room.players.values()].find(
      (candidate) => candidate.token === token
    );
    if (!player) {
      throw new Error("Reconnect window expired");
    }
    if (
      player.connected ||
      player.disconnectedAt === undefined ||
      nowMs - player.disconnectedAt > RECONNECT_GRACE_MS
    ) {
      throw new Error("Reconnect window expired");
    }

    room.players.delete(player.id);
    player.id = playerId;
    player.connected = true;
    delete player.disconnectedAt;
    room.players.set(playerId, player);
    room.lastActivityAt = nowMs;
    return player;
  }

  cleanupDisconnectedPlayers(nowMs: number): Array<{
    code: string;
    playerId: string;
  }> {
    const removed: Array<{ code: string; playerId: string }> = [];
    for (const [code, room] of this.rooms) {
      for (const [playerId, player] of room.players) {
        if (
          !player.connected &&
          player.disconnectedAt !== undefined &&
          nowMs - player.disconnectedAt >= RECONNECT_GRACE_MS
        ) {
          room.players.delete(playerId);
          removed.push({ code, playerId });
        }
      }
      if (room.players.size === 0) {
        this.rooms.delete(code);
      }
    }
    return removed;
  }

  cleanupIdleRooms(nowMs: number): string[] {
    const deletedCodes: string[] = [];
    for (const [code, room] of this.rooms) {
      if (nowMs - room.lastActivityAt >= RECONNECT_GRACE_MS) {
        this.rooms.delete(code);
        deletedCodes.push(code);
      }
    }
    return deletedCodes;
  }

  hasRoom(code: string): boolean {
    return this.rooms.has(code);
  }

  getRoom(code: string): Room {
    return this.getRoomOrThrow(code);
  }

  private getRoomOrThrow(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error("Room not found");
    }
    return room;
  }

  private generateCode(): string {
    let code = "";
    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      const characterIndex = randomInt(ROOM_ALPHABET.length);
      code += ROOM_ALPHABET[characterIndex] ?? "A";
    }
    return code;
  }
}
