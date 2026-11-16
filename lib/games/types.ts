// Contrato genérico motor ↔ plataforma (SPEC 07). Cada juego jugable expone un
// GameFactory y se registra en lib/games/registry.ts.

export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void; // solo juegos con vidas
  onLevel?: (level: number) => void; // solo juegos con nivel
  onStat?: (key: string, value: number) => void; // stats extra del HUD
  onGameOver: (finalScore: number) => void;
};

export type GameEngine = {
  start: () => void; // 'ready' → 'playing'
  pause: () => void; // congela el bucle e ignora input
  resume: () => void;
  reset: () => void; // vuelve a 'ready' con los valores iniciales
  destroy: () => void; // idempotente: cancela rAF y quita listeners
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;

export type ControlHint = { keys: string[]; label: string }; // keys: texto de cada <kbd>

export type HudStat = { key: string; label: string; initial: number };

export type PlayableGame = {
  create: GameFactory;
  lives: number | null; // null → la casilla Vidas no se pinta
  hasLevel: boolean;
  extraStats: HudStat[];
  controls: ControlHint[]; // leyenda del overlay de inicio
  startKey: "Space";
  ariaLabel: string; // aria-label del <canvas>
};
