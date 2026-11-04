import { afterEach, describe, expect, it, vi } from "vitest";
import { RECONNECT_GRACE_MS } from "shared";
import type { Role } from "shared";
import { RoomManager } from "./rooms.js";

describe("RoomManager", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a third player from a full room", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("host", 1_000);
    manager.joinRoom(room.code, "guest");

    expect(() => manager.joinRoom(room.code, "third")).toThrow(
      "Room is full"
    );
  });

  it("rejects an unknown room code", () => {
    const manager = new RoomManager();

    expect(() => manager.joinRoom("ZZZZ", "guest")).toThrow(
      "Room not found"
    );
  });

  it("creates unique uppercase room codes", () => {
    const manager = new RoomManager();
    const first = manager.createRoom("host-1", 1_000);
    const second = manager.createRoom("host-2", 1_000);

    expect(first.code).not.toBe(second.code);
    expect(first.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(second.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it("swaps roles on each subsequent round", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("host", 1_000);
    manager.joinRoom(room.code, "guest");

    const first = manager.assignRoles(room.code);
    const firstRoles = first.map((player) => player.role);
    const second = manager.assignRoles(room.code);

    expect(new Set(first.map((player) => player.role))).toEqual(
      new Set<Role>(["navigator", "runner"])
    );
    expect(second.map((player) => player.role)).toEqual(
      firstRoles.map((role) => (role === "navigator" ? "runner" : "navigator"))
    );
  });

  it("allows a disconnected player to reclaim their seat during the grace period", () => {
    vi.useFakeTimers();
    const manager = new RoomManager();
    const room = manager.createRoom("socket-a", Date.now(), "token-a");
    manager.joinRoom(room.code, "socket-b", Date.now(), "token-b");
    manager.disconnectPlayer(room.code, "socket-a", Date.now());
    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1);

    const player = manager.reconnectPlayer(
      room.code,
      "token-a",
      "socket-c",
      Date.now()
    );

    expect(player.id).toBe("socket-c");
    expect(player.connected).toBe(true);
  });

  it("removes a disconnected seat after the grace period", () => {
    vi.useFakeTimers();
    const manager = new RoomManager();
    const room = manager.createRoom("socket-a", Date.now(), "token-a");
    manager.joinRoom(room.code, "socket-b", Date.now(), "token-b");
    manager.disconnectPlayer(room.code, "socket-a", Date.now());
    vi.advanceTimersByTime(RECONNECT_GRACE_MS);

    expect(manager.cleanupDisconnectedPlayers(Date.now())).toEqual([
      { code: room.code, playerId: "socket-a" }
    ]);
    expect(() => manager.reconnectPlayer(
      room.code,
      "token-a",
      "socket-c",
      Date.now()
    )).toThrow("Reconnect window expired");
  });
});
