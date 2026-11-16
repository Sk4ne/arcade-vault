# Contrato motor ↔ plataforma

Extraído de SPEC 05 (`specs/05-asteroids-rocas.md`) y del código de ROCAS (`lib/games/asteroids/`, `components/games/asteroids-canvas.tsx`, `components/game-player.tsx`). Toda spec de juego debe respetarlo. Comprueba siempre el código actual antes de citarlo: si ya cambió, manda el código.

## Reglas del motor (no negociables)

- Motor en TypeScript estricto en `lib/games/<motor>/`, organizado como ROCAS:
  ```
  lib/games/<motor>/
    constants.ts   // mundo lógico (W, H), constantes de juego, COLORS
    entities.ts    // clases/funciones de entidades; reciben ctx por parámetro
    engine.ts      // create<Motor>Game(canvas, callbacks): input, bucle, colisiones, niveles
    types.ts       // solo si el juego necesita tipos propios además de los genéricos
  ```
- Sin estado global mutable de módulo, sin `document.getElementById`; solo usa el `<canvas>` recibido y `window`.
- API: `{ start, pause, resume, reset, destroy }`. `destroy()` cancela el `requestAnimationFrame`, quita todos los listeners y es idempotente (Strict Mode monta dos veces).
- Bucle con `requestAnimationFrame` y `dt` limitado a 50 ms. `resume()` reinicia `lastTime` para que no haya saltos. Si el original usa `setInterval` o caída por ticks (Tetris), se convierte a acumulador de tiempo dentro del rAF.
- Estados internos: `ready` → `playing` ↔ `paused` → `gameover` (más los que el juego necesite, p. ej. `dead` entre vidas). En `ready` el canvas pinta un fondo de ambiente, sin empezar la partida.
- Callbacks emitidos **solo cuando el valor cambia** (evita re-renders a 60 fps).
- Input propio con listeners en `window`: `preventDefault` solo de las teclas del juego, y nunca si el foco está en `input`/`textarea`/`contentEditable` o el motor no está en `playing`.
- Sin HUD (puntuación, vidas, nivel), sin GAME OVER y sin pausa propia en el canvas: los pinta la plataforma. Solo se queda en el canvas el estado efímero del juego (indicador de power-up, pieza siguiente, etc.).
- Sin reinicio por teclado: lo gestiona "JUGAR DE NUEVO" del modal.
- Sin `localStorage` propio de high-score: lo sustituye Supabase (ver `leaderboard.md`).
- Mundo lógico fijo (ROCAS: 800×600) escalado por CSS a `.crt-screen` (4:3) con `width: 100%`; backing store `W*dpr × H*dpr` y `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`. Si el mundo no es 4:3, se decide en la spec (letterbox centrado dentro de un canvas 4:3 es lo recomendado).
- Colores: nombres de variables CSS en `COLORS`, resueltos con `getComputedStyle(document.documentElement)` al crear el motor (`var(--x)` no vale en `strokeStyle`). `shadowBlur` solo en los elementos principales, no en partículas.
- Assets (si se usan): en `public/games/<id>/`, cargados desde el motor con rutas absolutas `/games/<id>/…`; el motor no arranca hasta que estén cargados o pinta un fallback.

## Contrato genérico (bootstrap)

Hoy (tras SPEC 05/06) el contrato es específico de ROCAS: `AsteroidsCallbacks`, `AsteroidsCanvas` y `const isReal = game.id === "rocas"` en `GamePlayer`, con 3 vidas y leyenda de controles fijas. La **primera** spec de juego que genere este skill (cuando no exista `lib/games/registry.ts`) debe generalizarlo y migrar ROCAS. Diseño propuesto (ajústalo a lo decidido en la Fase 2):

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void;
  onLevel?: (level: number) => void;
  onStat?: (key: string, value: number) => void; // stats extra del HUD (p. ej. "lines")
  onGameOver: (finalScore: number) => void;
};

export type GameEngine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;

export type ControlHint = { keys: string[]; label: string }; // keys: texto de cada <kbd>

export type HudStat = { key: string; label: string; initial: number }; // stats extra

export type PlayableGame = {
  create: GameFactory;
  lives: number | null; // null → el HUD muestra "—" y no pide onLives
  hasLevel: boolean;
  extraStats: HudStat[];
  controls: ControlHint[]; // leyenda del overlay "PULSA ESPACIO PARA EMPEZAR"
  startKey: "Space"; // por ahora siempre ESPACIO
  ariaLabel: string; // aria-label del <canvas>
};
```

```ts
// lib/games/registry.ts
export const PLAYABLE_GAMES: Record<string, PlayableGame> = {
  rocas: { create: createAsteroidsGame, lives: 3, hasLevel: true, extraStats: [], controls: [...], ... },
};
export function getPlayableGame(id: string): PlayableGame | undefined;
```

Cambios del bootstrap:

- `lib/games/asteroids/types.ts` deja de definir `AsteroidsCallbacks`/`AsteroidsGame` y `createAsteroidsGame` pasa a ser un `GameFactory` (mismo comportamiento).
- `components/games/asteroids-canvas.tsx` → `components/games/game-canvas.tsx` genérico: recibe `create`, `callbacks` y `ariaLabel`; callbacks en ref; motor creado en `useEffect` y `destroy()` en el cleanup; handle imperativo `start/pause/resume/reset`.
- `components/game-player.tsx`: `const playable = getPlayableGame(game.id)`; `isReal = !!playable`; vidas, nivel, stats extra y leyenda de controles desde el registro. Ningún `if (game.id === …)`.
- El texto "REQUIERE TECLADO" usa `game.title` (ya lo hace).
- ROCAS debe funcionar exactamente igual que antes (criterio de aceptación explícito).

Si el registro ya existe, la spec solo añade la entrada del juego nuevo y, si hace falta, amplía el contrato (p. ej. una stat nueva) sin romper los juegos existentes.

## Plataforma (no cambia por juego)

- Reproductor: `components/game-player.tsx` con fases `ready | playing | paused | over`, overlay de inicio, overlay "EN PAUSA", botones PAUSA/REANUDAR, FIN, SALIR y modal "FIN DEL JUEGO".
- `releaseFocus` en los botones: evita que ESPACIO active un botón durante la partida.
- `useTouchOnly()` → "REQUIERE TECLADO" en dispositivos sin teclado.
- La página `app/juego/[id]/jugar/page.tsx` es Server Component con `generateStaticParams`; todo el motor vive en componentes cliente para no romper el prerender con `cacheComponents`.
