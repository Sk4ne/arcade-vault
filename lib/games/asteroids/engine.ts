import {
  COLORS,
  H,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
  type Palette,
} from "./entities";
import type { AsteroidsCallbacks, AsteroidsGame } from "./types";

type EngineState = "ready" | "playing" | "dead" | "paused" | "gameover";

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
const START_LIVES = 3;
const RESPAWN_DELAY = 2;
const SAFE_DIST = 130;
const GUARANTEED_DROP_AFTER = 5;

// Por si alguna variable CSS no está definida (la paleta del sitio).
const FALLBACK_COLORS: Palette = {
  ship: "#00f5ff",
  bullet: "#f5ff00",
  asteroid: "#ff006e",
  powerUp: "#00ff88",
  particle: "#f5ff00",
};

/** Resuelve COLORS: `var(--cyan)` no es válido en strokeStyle, hace falta el valor. */
function resolvePalette(canvas: HTMLCanvasElement): Palette {
  const styles = getComputedStyle(canvas);
  const palette = { ...FALLBACK_COLORS };
  for (const key of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
    const value = styles.getPropertyValue(COLORS[key]).trim();
    if (value) palette[key] = value;
  }
  return palette;
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
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

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  }

  function clearInput() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    e.preventDefault();
    // Solo se registra input mientras se juega: en pausa, listo o fin se ignora.
    if (state !== "playing" && state !== "dead") return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    keys[e.code] = false;
  }

  function onBlur() {
    clearInput();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let state: EngineState = "ready";
  let pausedFrom: EngineState = "ready";
  let startRequested = false;
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  // Últimos valores emitidos: los callbacks solo se llaman si el valor cambia.
  let emittedScore: number | null = null;
  let emittedLives: number | null = null;
  let emittedLevel: number | null = null;

  function emit() {
    if (score !== emittedScore) {
      emittedScore = score;
      callbacks.onScore(score);
    }
    if (lives !== emittedLives) {
      emittedLives = lives;
      callbacks.onLives(lives);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      callbacks.onLevel(level);
    }
  }

  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initWorld() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    deadTimer = 0;
    state = "ready";
    startRequested = false;
    clearInput();
    spawnAsteroids(3 + level);
    emit();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      clearInput();
      emit();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }

  function updateParticles(dt: number) {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (startRequested && state === "ready") {
      // La transición ocurre en el frame siguiente a start() para que el
      // ESPACIO que arrancó la partida no dispare.
      startRequested = false;
      clearInput();
      ship.reset();
      state = "playing";
    }

    if (state === "ready" || state === "gameover") {
      asteroids.forEach((a) => a.update(dt));
      updateParticles(dt);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (state !== "playing") return;

    // Disparar
    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, {
      left: !!keys.ArrowLeft,
      right: !!keys.ArrowRight,
      up: !!keys.ArrowUp,
    });
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= GUARANTEED_DROP_AFTER;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawPowerUpIndicator() {
    if (ship.dead || ship.tripleShot <= 0) return;
    ctx.fillStyle = palette.powerUp;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    // En 'ready' solo se ve el campo de asteroides de fondo.
    if (state !== "ready") ship.draw(ctx, palette);

    drawPowerUpIndicator();
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
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
  startLoop(); // en 'ready' anima el campo de asteroides de fondo

  // ── API ─────────────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || state !== "ready") return;
      startRequested = true;
      startLoop();
    },
    pause() {
      if (destroyed || state === "paused") return;
      pausedFrom = state;
      state = "paused";
      clearInput();
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
