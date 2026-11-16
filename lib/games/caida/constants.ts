// Valores de juego copiados de references/started-games/03-tetris/game.js;
// los de layout (W, H, BOARD_*, NEXT_*) son propios del canvas 4:3 del CRT.

// Mundo lógico fijo: el canvas se escala por CSS a .crt-screen (4:3).
export const W = 800;
export const H = 600;

// Límite del paso de simulación (milisegundos).
export const MAX_DT_MS = 50;

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Tablero 300×600 centrado en horizontal, a altura completa.
export const BOARD_X = 250;
export const BOARD_Y = 0;

// Recuadro SIGUIENTE: 4×4 celdas de BLOCK a la derecha del tablero.
export const NEXT_X = 580;
export const NEXT_Y = 60;
export const NEXT_SIZE = 120;

export type Shape = readonly (readonly number[])[];

// Índice = tipo de pieza (1–8); cada celda ocupada guarda su tipo.
export const PIECES: readonly (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

export const PIECE_TYPES = 8;

// Desplazamientos horizontales probados al rotar (wall kicks).
export const KICKS = [0, -1, 1, -2, 2] as const;

export const LINE_SCORES = [0, 100, 300, 500, 800] as const; // × nivel
export const SOFT_DROP_POINTS = 1; // por fila bajada con ↓
export const HARD_DROP_POINTS = 2; // por fila recorrida con ESPACIO
export const LINES_PER_LEVEL = 10; // nivel = floor(lines / 10) + 1
export const BASE_DROP_MS = 1000; // intervalo = max(100, 1000 − (nivel − 1) × 90)
export const DROP_STEP_MS = 90;
export const MIN_DROP_MS = 100;
export const GHOST_ALPHA = 0.2;

// Nombres de variables CSS; el motor los resuelve con getComputedStyle al crearse.
// Índice = tipo de pieza.
export const COLORS = [
  null,
  "--cyan", // I
  "--yellow", // O
  "--magenta", // T
  "--green", // S
  "--bronze", // Z
  "--silver", // J
  "--gold", // L
  "--ink-dim", // N
] as const;
export const GRID_COLOR = "--line-2";
export const FRAME_COLOR = "--line";
export const LABEL_COLOR = "--ink-dim";
export const LABEL_FONT = "--pixel";
