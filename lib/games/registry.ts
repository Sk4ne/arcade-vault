import { createAsteroidsGame } from "./asteroids/engine";
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
};

export function getPlayableGame(id: string): PlayableGame | undefined {
  return Object.hasOwn(PLAYABLE_GAMES, id) ? PLAYABLE_GAMES[id] : undefined;
}
