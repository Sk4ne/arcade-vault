import { cacheTag } from "next/cache";

import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import type { LeaderboardRow, TopScoresResult } from "@/lib/leaderboard/types";

type LeaderboardView = Database["public"]["Views"]["leaderboard"]["Row"];

export const TOP_LIMIT = 10;

export function leaderboardTag(gameId: string): string {
  return `leaderboard:${gameId}`;
}

/** ISO timestamp → "dd/mm/aaaa" (UTC, so server and client agree). */
export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function toLeaderboardRow(
  row: Pick<LeaderboardView, "rank" | "player_name" | "score" | "created_at">,
): LeaderboardRow {
  return {
    rank: row.rank ?? 0, // never null in practice: row_number() always yields a value
    name: row.player_name,
    score: row.score,
    date: formatScoreDate(row.created_at),
  };
}

/**
 * Cached top 10. Throws on failure so the error is NOT stored in the cache;
 * the next request retries the query.
 */
async function fetchTopScores(gameId: string): Promise<LeaderboardRow[]> {
  "use cache";
  cacheTag(leaderboardTag(gameId));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("rank, player_name, score, created_at")
    .eq("game_id", gameId)
    .order("rank", { ascending: true })
    .limit(TOP_LIMIT);

  if (error) throw new Error("leaderboard query failed");
  return data.map(toLeaderboardRow);
}

export async function getTopScores(gameId: string): Promise<TopScoresResult> {
  try {
    return { ok: true, rows: await fetchTopScores(gameId) };
  } catch {
    return { ok: false };
  }
}
