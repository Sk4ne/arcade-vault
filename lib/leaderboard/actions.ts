"use server";

import { updateTag } from "next/cache";

import { leaderboardTag, toLeaderboardRow } from "@/lib/leaderboard/queries";
import type {
  LeaderboardRow,
  SubmitScoreInput,
  SubmitScoreResult,
} from "@/lib/leaderboard/types";
import {
  NAME_RE,
  normalizePlayerName,
  parseSubmitScore,
} from "@/lib/leaderboard/validation";
import { createPublicClient } from "@/lib/supabase/public";

// Postgres error codes that mean "this game does not accept scores".
const FOREIGN_KEY_VIOLATION = "23503"; // game_id not in games
const RLS_VIOLATION = "42501"; // game exists but is not playable

/**
 * Validates and stores a score, then expires the game's leaderboard cache.
 * Only returns result codes: never Supabase messages, URLs or keys.
 */
export async function submitScore(
  input: SubmitScoreInput,
): Promise<SubmitScoreResult> {
  const parsed = parseSubmitScore(input);
  if (!parsed) return { ok: false, error: "invalid" };

  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("scores").insert({
      game_id: parsed.game,
      player_name: parsed.name,
      score: parsed.score,
    });

    if (error) {
      if (
        error.code === FOREIGN_KEY_VIOLATION ||
        error.code === RLS_VIOLATION
      ) {
        return { ok: false, error: "not_playable" };
      }
      return { ok: false, error: "unavailable" };
    }
  } catch {
    return { ok: false, error: "unavailable" };
  }

  updateTag(leaderboardTag(parsed.game));
  return { ok: true };
}

/** Best score and rank for a name in a game, or null (no score, bad input or error). */
export async function getPlayerBest(
  game: string,
  name: string,
): Promise<LeaderboardRow | null> {
  if (typeof game !== "string" || typeof name !== "string") return null;
  const normalized = normalizePlayerName(name);
  if (!NAME_RE.test(normalized)) return null;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("leaderboard")
      .select("rank, player_name, score, created_at")
      .eq("game_id", game)
      .eq("player_name", normalized)
      .maybeSingle();

    if (error || !data) return null;
    return toLeaderboardRow(data);
  } catch {
    return null;
  }
}
