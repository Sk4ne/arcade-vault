import { MAX_SCORE } from "@/lib/leaderboard/validation";

import type { GameCallbacks, GameEngine } from "../types";
import {
  BASE_DROP_MS,
  COLORS,
  DROP_STEP_MS,
  FRAME_COLOR,
  GRID_COLOR,
  H,
  HARD_DROP_POINTS,
  KICKS,
  LABEL_COLOR,
  LABEL_FONT,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_DT_MS,
  MIN_DROP_MS,
  SOFT_DROP_POINTS,
  W,
} from "./constants";
import {
  clearLines,
  collide,
  createBoard,
  drawBoard,
  drawNext,
  drawPiece,
  ghostY,
  merge,
  randomPiece,
  rotateCW,
  type Board,
  type Palette,
  type Piece,
} from "./entities";

type EngineState = "ready" | "playing" | "paused" | "gameover";

// Flechas y ESPACIO: se les hace preventDefault para que la página no haga scroll.
const SCROLL_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const GAME_KEYS = new Set([...SCROLL_KEYS, "KeyX"]);

// Por si alguna variable CSS no está definida (valores de la paleta del sitio).
const FALLBACK_PALETTE: Palette = {
  pieces: [
    "",
    "#00f5ff", // I --cyan
    "#f5ff00", // O --yellow
    "#ff006e", // T --magenta
    "#00ff88", // S --green
    "#d97a3a", // Z --bronze
    "#c7d0e0", // J --silver
    "#ffcf3a", // L --gold
    "#8a8fb5", // N --ink-dim
  ],
  grid: "rgba(255, 255, 255, 0.06)",
  frame: "rgba(0, 245, 255, 0.18)",
  label: "#8a8fb5",
  font: "monospace",
};

/** Resuelve las variables CSS: `var(--cyan)` no es válido en fillStyle. */
function resolvePalette(canvas: HTMLCanvasElement): Palette {
  const styles = getComputedStyle(canvas);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  const font = styles.getPropertyValue(LABEL_FONT).trim();
  return {
    pieces: COLORS.map((name, i) =>
      name ? read(name, FALLBACK_PALETTE.pieces[i]) : "",
    ),
    grid: read(GRID_COLOR, FALLBACK_PALETTE.grid),
    frame: read(FRAME_COLOR, FALLBACK_PALETTE.frame),
    label: read(LABEL_COLOR, FALLBACK_PALETTE.label),
    // Si la fuente pixel aún no ha cargado, el canvas usa monospace.
    font: font ? `${font}, monospace` : FALLBACK_PALETTE.font,
  };
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function dropIntervalFor(level: number) {
  return Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * DROP_STEP_MS);
}

export function createCaidaGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // Resolución lógica W×H; backing store multiplicado por devicePixelRatio
  // para nitidez. El tamaño visible lo fija el CSS (width: 100%).
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const palette = resolvePalette(canvas);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let state: EngineState = "ready";
  let pausedFrom: EngineState = "ready";
  let board: Board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = BASE_DROP_MS;
  let dropAccum = 0;
  // El ESPACIO que arranca la partida no debe soltar la primera pieza: el hard
  // drop solo se acepta tras un keyup de ESPACIO posterior a start().
  let spaceArmed = false;

  function initWorld() {
    state = "ready";
    board = createBoard();
    current = null;
    next = null;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = BASE_DROP_MS;
    dropAccum = 0;
    spaceArmed = false;
  }

  // Últimos valores emitidos: los callbacks solo se llaman si el valor cambia.
  let emittedScore: number | null = null;
  let emittedLines: number | null = null;
  let emittedLevel: number | null = null;

  function emit() {
    if (score !== emittedScore) {
      emittedScore = score;
      callbacks.onScore(score);
    }
    if (lines !== emittedLines) {
      emittedLines = lines;
      callbacks.onStat?.("lines", lines);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      callbacks.onLevel?.(level);
    }
  }

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  function gameOver() {
    state = "gameover";
    emit();
    callbacks.onGameOver(score);
  }

  /** La siguiente pasa a ser la actual; si no cabe al aparecer, fin de partida. */
  function spawn() {
    current = next ?? randomPiece();
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }

  /** Fusiona, limpia líneas y hace aparecer la siguiente pieza. */
  function lockPiece() {
    if (!current) return;
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      addScore((LINE_SCORES[cleared] ?? 0) * level); // nivel anterior a la subida
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = dropIntervalFor(level);
    }
    spawn();
  }

  function move(dx: number) {
    if (current && !collide(board, current.shape, current.x + dx, current.y))
      current.x += dx;
  }

  function tryRotate() {
    if (!current) return;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function softDrop() {
    if (!current) return;
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(SOFT_DROP_POINTS);
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!current) return;
    const gy = ghostY(board, current);
    addScore((gy - current.y) * HARD_DROP_POINTS);
    current.y = gy;
    lockPiece();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    // Solo se juega en 'playing': en listo, pausa o fin las teclas se ignoran.
    if (state !== "playing") return;
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    switch (e.code) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        if (!spaceArmed || e.repeat) return;
        hardDrop();
        break;
    }
    emit();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space" && state === "playing") spaceArmed = true;
  }

  function onBlur() {
    // Si se suelta ESPACIO fuera de la ventana no llega el keyup.
    if (state === "playing") spaceArmed = true;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state !== "playing" || !current) return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    // En 'ready' no hay piezas: tablero y recuadro SIGUIENTE vacíos.
    drawBoard(ctx, board, palette);
    if (current) {
      drawPiece(ctx, current, ghostY(board, current), palette, true);
      drawPiece(ctx, current, current.y, palette);
    }
    drawNext(ctx, next, palette);
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT_MS);
    lastTime = ts;
    update(dt);
    emit();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (destroyed || rafId !== null) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  initWorld();
  emit();
  startLoop(); // en 'ready' pinta el tablero vacío

  // ── API ─────────────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || state !== "ready") return;
      state = "playing";
      spaceArmed = false;
      dropAccum = 0;
      spawn();
      emit();
      startLoop();
    },
    pause() {
      if (destroyed || state === "paused") return;
      pausedFrom = state;
      state = "paused";
      stopLoop();
    },
    resume() {
      if (destroyed || state !== "paused") return;
      state = pausedFrom;
      startLoop(); // reinicia lastTime: sin salto de dt tras la pausa
    },
    reset() {
      if (destroyed) return;
      stopLoop();
      initWorld();
      emit();
      startLoop();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
