"use client";

import { useEffect, useState } from "react";

import { useUser } from "@/components/user-provider";
import { fmt } from "@/lib/data";
import { getPlayerBest } from "@/lib/leaderboard/actions";
import type { LeaderboardRow } from "@/lib/leaderboard/types";
import { NAME_RE, normalizePlayerName } from "@/lib/leaderboard/validation";

const YELLOW = { color: "var(--yellow)" } as const;

/** "TU MEJOR MARCA EN <JUEGO>" row. Hidden without session or without a score. */
export function PlayerBest({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const { user } = useUser();
  const name = user ? normalizePlayerName(user.name) : "";
  const lookup = NAME_RE.test(name) ? `${gameId}:${name}` : null;

  // Result tagged with the lookup it belongs to, so a stale answer is never shown.
  const [best, setBest] = useState<{
    lookup: string;
    row: LeaderboardRow | null;
  } | null>(null);

  useEffect(() => {
    if (!lookup) return;
    let cancelled = false;
    getPlayerBest(gameId, name).then(
      (row) => {
        if (!cancelled) setBest({ lookup, row });
      },
      () => {
        if (!cancelled) setBest({ lookup, row: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [lookup, gameId, name]);

  const row = best && best.lookup === lookup ? best.row : null;
  if (!lookup || !row) return null;

  return (
    <>
      <div className="tr you-label">▸ TU MEJOR MARCA EN {gameTitle}</div>
      <div className="tr you">
        <div className="rk" style={YELLOW}>
          #{String(row.rank).padStart(2, "0")}
        </div>
        <div className="pl" style={YELLOW}>
          {row.name}
        </div>
        <div
          className="sc"
          style={{ ...YELLOW, textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
        >
          {fmt(row.score)}
        </div>
        <div className="dt">{row.date}</div>
      </div>
    </>
  );
}
