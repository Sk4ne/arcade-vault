import { createAsteroidsGame } from "./asteroids/engine";
import { createCaidaGame } from "./caida/engine";
import type { PlayableGame } from "./types";

// Juegos con motor real. Sus ids deben coincidir con los de public.games
// que tienen playable = true; el resto de fichas siguen simuladas.
export const PLAYABLE_GAMES: Record<string, PlayableGame> = {
  rocas: {
    create: createAsteroidsGame,
    lives: 3,
    hasLevel: true,
    extraStats: [],
    controls: [
      { keys: ["←", "→"], label: "rotar" },
      { keys: ["↑"], label: "propulsar" },
      { keys: ["ESPACIO"], label: "disparar" },
    ],
    startKey: "Space",
    ariaLabel: "ROCAS: campo de asteroides",
  },
  caida: {
    create: createCaidaGame,
    lives: null,
    hasLevel: true,
    extraStats: [{ key: "lines", label: "Líneas", initial: 0 }],
    controls: [
      { keys: ["←", "→"], label: "mover" },
      { keys: ["↑", "X"], label: "rotar" },
      { keys: ["↓"], label: "bajar" },
      { keys: ["ESPACIO"], label: "caída" },
    ],
    startKey: "Space",
    ariaLabel: "CAÍDA: tablero de piezas",
  },
};

export function getPlayableGame(id: string): PlayableGame | undefined {
  return Object.hasOwn(PLAYABLE_GAMES, id) ? PLAYABLE_GAMES[id] : undefined;
}
