export type AsteroidsCallbacks = {
  onScore: (score: number) => void; // cada vez que cambia
  onLives: (lives: number) => void; // 3 al empezar, decrementa al morir
  onLevel: (level: number) => void; // 1 al empezar
  onGameOver: (finalScore: number) => void; // lives === 0
};

export type AsteroidsGame = {
  start: () => void; // estado 'ready' → 'playing'; arranca el bucle
  pause: () => void; // congela update() y draw(); ignora input
  resume: () => void;
  reset: () => void; // vuelve a 'ready' con score 0, lives 3, level 1
  destroy: () => void; // cancelAnimationFrame + removeEventListener
};
