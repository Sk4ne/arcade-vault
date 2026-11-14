import type { SubmitScoreInput } from "@/lib/leaderboard/types";

// Same rules as the CHECK constraints in the `scores` table.
export const NAME_RE = /^[A-Z0-9_]{1,10}$/;
export const MAX_SCORE = 9_999_999;
export const MAX_NAME_LENGTH = 10;

// Game ids are URL slugs (lib/data.ts); the DB checks they exist and are playable.
const GAME_ID_RE = /^[a-z0-9-]{1,64}$/;

/** Uppercases, drops characters outside A–Z, 0–9 and _, and cuts to 10. */
export function normalizePlayerName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, MAX_NAME_LENGTH);
}

/** Returns a clean input, or null if anything is invalid. */
export function parseSubmitScore(input: unknown): SubmitScoreInput | null {
  if (typeof input !== "object" || input === null) return null;
  const { game, score, name } = input as Record<string, unknown>;

  if (typeof game !== "string" || !GAME_ID_RE.test(game)) return null;

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return null;
  }

  if (typeof name !== "string") return null;
  const normalized = normalizePlayerName(name);
  if (!NAME_RE.test(normalized)) return null;

  return { game, score, name: normalized };
}
