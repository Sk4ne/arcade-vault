export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "dd/mm/aaaa"
};

export type SubmitScoreInput = { game: string; score: number; name: string };

export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_playable" | "unavailable" };

export type TopScoresResult =
  { ok: true; rows: LeaderboardRow[] } | { ok: false };
