export type Direction = "up" | "down" | "left" | "right";
export type SignalType =
  | "up"
  | "down"
  | "left"
  | "right"
  | "stop"
  | "danger"
  | "good";
export type Role = "navigator" | "runner";
export type Phase = "lobby" | "playing" | "roundEnd";
export type Difficulty = "small" | "medium" | "large";

export type Position = {
  x: number;
  y: number;
};

export type Cell = {
  walls: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
};

export type Maze = {
  width: number;
  height: number;
  cells: Cell[][];
};

export type RunnerView = {
  position: Position;
  visibleCells: Array<{ pos: Position; cell: Cell }>;
  radius: number;
  endsAt: number;
  lives: number;
  signalsSent: number;
  wrongMoves: number;
};

export type NavigatorView = {
  maze: Maze;
  exit: Position;
  runnerPos: Position;
  endsAt: number;
  lives: number;
  signalsSent: number;
  wrongMoves: number;
};

export type RoundResult = {
  outcome: "win" | "lose";
  wrongMoves: number;
  signalsSent: number;
  score: number;
};

export type RoomUpdate = {
  code: string;
  hostId: string;
  difficulty: Difficulty;
  players: Array<{
    id: string;
    ready: boolean;
    role?: Role;
    connected: boolean;
  }>;
};

export interface ClientToServerEvents {
  "room:create": () => void;
  "room:join": (code: string) => void;
  "room:difficulty": (code: string, difficulty: Difficulty) => void;
  "room:reconnect": (code: string, playerToken: string) => void;
  "player:ready": (code: string) => void;
  "runner:move": (code: string, dir: Direction) => void;
  "navigator:signal": (code: string, type: SignalType) => void;
}

export interface ServerToClientEvents {
  "player:token": (playerToken: string) => void;
  "room:update": (room: RoomUpdate) => void;
  "round:start": (view: NavigatorView | RunnerView) => void;
  "runner:moved": (view: NavigatorView | RunnerView) => void;
  "signal:received": (type: SignalType) => void;
  "round:end": (result: RoundResult) => void;
  error: (message: string) => void;
}
