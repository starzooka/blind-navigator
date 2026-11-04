import { z } from "zod";

export const roomCodeSchema = z.string().regex(/^[A-HJ-NP-Z]{4}$/);
export const playerTokenSchema = z.string().min(20).max(128);
export const directionSchema = z.enum(["up", "down", "left", "right"]);
export const signalTypeSchema = z.enum([
  "up",
  "down",
  "left",
  "right",
  "stop",
  "danger",
  "good"
]);
export const difficultySchema = z.enum(["small", "medium", "large"]);
