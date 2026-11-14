import Link from "next/link";
import { Suspense } from "react";

import { HallBoard, HallBoardMessage } from "@/components/hall/hall-board";
import { GAMES } from "@/lib/data";

export const DEFAULT_HALL_GAME = "rocas";

/** `?juego=` value → known game id; missing or unknown → DEFAULT_HALL_GAME. */
export function resolveHallGame(raw: string | string[] | undefined): string {
  const id = Array.isArray(raw) ? raw[0] : raw;
  return GAMES.some((g) => g.id === id) ? (id as string) : DEFAULT_HALL_GAME;
}

/**
 * Hall of Fame. `gameId` is undefined while the URL is not known yet
 * (static shell / Suspense fallback): tabs render with none active and the
 * board shows the loading state.
 */
export function HallOfFame({ gameId }: { gameId?: string }) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <nav className="hall-tabs" aria-label="Juegos">
        {GAMES.map((g) => {
          const active = g.id === gameId;
          return (
            <Link
              key={g.id}
              href={`/salon?juego=${g.id}`}
              className={"chip" + (active ? " active" : "")}
              aria-current={active ? "page" : undefined}
              scroll={false}
            >
              {g.title}
            </Link>
          );
        })}
      </nav>

      {gameId ? (
        <Suspense
          key={gameId}
          fallback={<HallBoardMessage text="CARGANDO RANKING…" />}
        >
          <HallBoard gameId={gameId} />
        </Suspense>
      ) : (
        <HallBoardMessage text="CARGANDO RANKING…" />
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
