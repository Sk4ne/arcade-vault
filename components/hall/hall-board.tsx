import { PlayerBest } from "@/components/hall/player-best";
import { GAMES, fmt } from "@/lib/data";
import { getTopScores } from "@/lib/leaderboard/queries";
import type { LeaderboardRow } from "@/lib/leaderboard/types";

const EMPTY = "---";

function TableHead() {
  return (
    <div className="th">
      <div>RANGO</div>
      <div>JUGADOR</div>
      <div>PUNTUACIÓN</div>
      <div>FECHA</div>
    </div>
  );
}

/** Table with a single message row (loading, empty or error). */
export function HallBoardMessage({
  text,
  tone,
}: {
  text: string;
  tone?: "error";
}) {
  return (
    <div className="hall-table">
      <TableHead />
      <div
        className={"hall-msg" + (tone === "error" ? " error" : "")}
        role={tone === "error" ? "alert" : "status"}
      >
        {text}
      </div>
    </div>
  );
}

function PodiumSlot({
  row,
  place,
}: {
  row: LeaderboardRow | undefined;
  place: "gold" | "silver" | "bronze";
}) {
  const gold = place === "gold";
  const num = gold ? "01" : place === "silver" ? "02" : "03";
  return (
    <div className={"podium-slot " + place}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {num}
      </div>
      <div className="name">{row?.name ?? EMPTY}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {row ? fmt(row.score) : EMPTY}
      </div>
      <div className="date">{row?.date ?? EMPTY}</div>
    </div>
  );
}

export async function HallBoard({ gameId }: { gameId: string }) {
  const result = await getTopScores(gameId);

  if (!result.ok) {
    return (
      <HallBoardMessage text="NO SE PUDO CARGAR EL RANKING" tone="error" />
    );
  }

  const rows = result.rows;
  const title =
    GAMES.find((g) => g.id === gameId)?.title ?? gameId.toUpperCase();

  return (
    <>
      <div className="podium">
        <PodiumSlot row={rows[1]} place="silver" />
        <PodiumSlot row={rows[0]} place="gold" />
        <PodiumSlot row={rows[2]} place="bronze" />
      </div>

      <div className="hall-table">
        <TableHead />
        {rows.length === 0 ? (
          <div className="hall-msg" role="status">
            SIN PUNTUACIONES TODAVÍA
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.rank}
              className={
                "tr" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{fmt(r.score)}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))
        )}
        <PlayerBest key={gameId} gameId={gameId} gameTitle={title} />
      </div>
    </>
  );
}
