// Mundo lógico fijo: el canvas se escala por CSS, la dificultad no depende de la pantalla.
export const W = 800;
export const H = 600;

// Límite del paso de simulación (segundos).
export const MAX_DT = 0.05;

// Por tamaño de asteroide: índice 1 (pequeño), 2 (mediano), 3 (grande).
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;

export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Nombres de variables CSS; el motor los resuelve con getComputedStyle al crearse.
export const COLORS = {
  ship: "--cyan",
  bullet: "--yellow",
  asteroid: "--magenta",
  powerUp: "--green",
  particle: "--yellow",
} as const;
