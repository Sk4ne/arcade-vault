import Link from "next/link";
import type { Game } from "@/lib/data";

/** Mini-tarjeta de la Home: enlace real a la ficha del juego. */
export function MiniCard({ game }: { game: Game }) {
  return (
    <Link href={`/juego/${game.id}`} className="mini-card" style={{ display: "block" }}>
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
