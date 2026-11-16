# SPEC 07 — Juego de piezas que caen jugable como "CAÍDA"

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-16
> **Objective:** Portar a TypeScript el juego de `references/started-games/03-tetris` como CAÍDA jugable en `/juego/caida/jugar`, con el HUD, la pausa y el modal de la plataforma y sus puntuaciones en el Salón de la Fama.

## Por qué existe esta spec

Hoy la ficha `caida` es un juego simulado: `GamePlayer` suma puntos aleatorios y el modal muestra "MODO DEMO · NO PUNTÚA". El original (`game.js`, ~305 líneas) es un script con estado global (`board`, `current`, `next`, `score`…), `document.getElementById` para dos canvas y el HUD, un listener `keydown` en `document`, overlay y botón de reinicio en HTML, un selector de tema con `localStorage` (`tetris-theme`) y pausa propia con `P`. No se puede cargar tal cual en una app React con navegación cliente.

Además, el contrato motor ↔ plataforma de SPEC 05 es específico de ROCAS: `AsteroidsCallbacks`, `AsteroidsCanvas` y `isReal = game.id === "rocas"` en `GamePlayer`, con 3 vidas y la leyenda de controles fijas en el JSX. CAÍDA no tiene vidas y necesita una stat extra (Líneas). Es el segundo juego real, así que esta spec generaliza el contrato en un registro (`PLAYABLE_GAMES`) y migra ROCAS a él sin cambiar su comportamiento.

## Scope

**In:**

- **Bootstrap del contrato genérico:**
  - Tipos `lib/games/types.ts`: `GameCallbacks`, `GameEngine`, `GameFactory`, `ControlHint`, `HudStat`, `PlayableGame`.
  - Registro `lib/games/registry.ts` con `PLAYABLE_GAMES` y `getPlayableGame(id)`.
  - `components/games/game-canvas.tsx` genérico (sustituye a `components/games/asteroids-canvas.tsx`, que se elimina).
  - `createAsteroidsGame` pasa a ser un `GameFactory`; `lib/games/asteroids/types.ts` deja de exportar `AsteroidsCallbacks`/`AsteroidsGame`.
  - `GamePlayer` sin comparaciones con ids de juego: modo real, vidas, nivel, stats extra, leyenda de controles y `aria-label` salen del registro.
  - La casilla Vidas del HUD no se pinta cuando `lives === null`.
  - ROCAS funciona exactamente igual que antes.
- **Motor de CAÍDA** en `lib/games/caida/` con `createCaidaGame(canvas, callbacks)` que devuelve `{ start, pause, resume, reset, destroy }`, portando del original:
  - Tablero 10×20, bloque 30 px, matriz `ROWS × COLS` con `0` = vacío y `1–8` = tipo de pieza.
  - Las 8 piezas del original (I, O, T, S, Z, J, L y la tuerca N), sorteo uniforme `1–8`, aparición en `x = floor(COLS/2) − floor(ancho/2)`, `y = 0`.
  - Rotación horaria (`rotateCW`, transpuesta + reverso) con wall kicks `[0, −1, 1, −2, 2]`.
  - Colisión con bordes y bloques fijados; fusión, limpieza de líneas de abajo arriba y nueva fila vacía arriba.
  - Pieza fantasma al 20 % de opacidad.
  - Caída automática por acumulador de tiempo dentro del `requestAnimationFrame`, con `dt` limitado a 50 ms.
  - Puntuación, nivel y velocidad idénticos al original (ver Modelo de datos).
  - Fin de partida cuando la pieza recién aparecida colisiona → `onGameOver(score)`.
- Puntuación limitada en el motor a `MAX_SCORE` (9.999.999) de `lib/leaderboard/validation.ts`.
- **Controles:** ← → mover · ↑ o X rotar · ↓ bajar (soft drop) · ESPACIO caída (hard drop). Repetición de tecla del sistema operativo, sin DAS propio.
- ESPACIO inicia la partida desde el overlay de la plataforma; el motor ignora esa pulsación y solo acepta hard drop tras un `keyup` de ESPACIO posterior a `start()` y nunca con `e.repeat`.
- **Mundo y aspecto:**
  - Canvas lógico 800×600 escalado por CSS a `.crt-screen` (4:3), backing store × `devicePixelRatio`.
  - Tablero 300×600 en `x = 250`, a altura completa.
  - A su derecha, rótulo "SIGUIENTE" y recuadro 120×120 con la pieza siguiente, pintados en el mismo canvas.
- **Recolor neón** de las piezas con variables CSS: I `--cyan`, O `--yellow`, T `--magenta`, S `--green`, Z `--bronze`, J `--silver`, L `--gold`, N `--ink-dim`.
  - `shadowBlur` solo en la pieza activa.
  - Bloques fijados y fantasma sin glow.
  - Rejilla con `--line-2` y marco del tablero y del recuadro SIGUIENTE con `--line`.
- En estado `ready` el canvas pinta el tablero vacío con rejilla y marco y el recuadro SIGUIENTE vacío.
- Se elimina del original: HUD en DOM (`score`, `lines`, `level`), overlay PAUSA/GAME OVER, botón "Reiniciar", pausa con `P`, selector de tema y `localStorage` `tetris-theme`, estilos de `style.css`.
- Entrada `caida` en `PLAYABLE_GAMES`: `lives: null`, `hasLevel: true`, stat extra `lines` ("Líneas"), leyenda de controles y `ariaLabel`.
- HUD React de CAÍDA: Jugador, Puntuación, Líneas y Nivel (sin Vidas).
- Overlay "PULSA ESPACIO PARA EMPEZAR" con la leyenda de CAÍDA; "REQUIERE TECLADO" en dispositivos táctiles sin teclado (comportamiento actual).
- `long` de `caida` en `lib/data.ts`: mencionar la pieza tuerca y la pieza fantasma.
- Migración `supabase/migrations/<timestamp>_caida-playable.sql` con `update public.games set playable = true where id = 'caida';`.

**Out of scope (para futuras specs):**

- Sonido.
- Controles táctiles en pantalla.
- Atajos de pausa (P / Esc) y auto-pausa al ocultar la pestaña.
- DAS/ARR propios, hold de pieza, bolsa de 7 piezas, rotación antihoraria, T-spins, combos o cualquier mecánica que no exista en el original.
- Selector de tema claro/oscuro en el juego.
- Cambiar `DEFAULT_HALL_GAME` (sigue en `rocas`).
- Cambiar la portada `cover-tetro`, `short`, `best` o `plays` de `caida`.
- Auth real, anti-trampas y rate limit.
- Ranking real en `/juego/[id]` y en la Home.
- Port de los demás juegos (incluido `04-arkanoid`).
- Modificar `references/started-games/03-tetris/`.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

No hay tablas nuevas: se reutilizan `games`, `scores` y la vista `leaderboard` de SPEC 06. Solo cambia un dato (`games.playable` de `caida`).

### Contrato genérico

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void; // solo juegos con vidas
  onLevel?: (level: number) => void; // solo juegos con nivel
  onStat?: (key: string, value: number) => void; // stats extra del HUD
  onGameOver: (finalScore: number) => void;
};

export type GameEngine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void; // idempotente
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
```

```ts
// lib/games/registry.ts
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

export function getPlayableGame(id: string): PlayableGame | undefined;
```

```ts
// components/games/game-canvas.tsx — "use client"
export type GameHandle = Pick<
  GameEngine,
  "start" | "pause" | "resume" | "reset"
>;
type Props = {
  create: GameFactory;
  callbacks: GameCallbacks;
  ariaLabel: string;
  ref?: Ref<GameHandle>;
};
```

Orden de las casillas del HUD: Jugador · Puntuación · Vidas (si `lives !== null`) · stats extra · Nivel (si `hasLevel`). Las stats extra se muestran como entero sin relleno.

### Motor de CAÍDA

```ts
// lib/games/caida/constants.ts — valores copiados de game.js salvo los de layout
export const W = 800;
export const H = 600;
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = 250; // tablero 300×600 centrado
export const BOARD_Y = 0;
export const NEXT_X = 580; // recuadro SIGUIENTE (4×4 celdas de 30)
export const NEXT_Y = 60;
export const NEXT_SIZE = 120;

export const PIECES = [
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
] as const;

export const KICKS = [0, -1, 1, -2, 2];
export const LINE_SCORES = [0, 100, 300, 500, 800]; // × nivel
export const SOFT_DROP_POINTS = 1; // por fila bajada con ↓
export const HARD_DROP_POINTS = 2; // por fila recorrida con ESPACIO
export const LINES_PER_LEVEL = 10; // nivel = floor(lines / 10) + 1
export const BASE_DROP_MS = 1000; // intervalo = max(100, 1000 − (nivel − 1) × 90)
export const DROP_STEP_MS = 90;
export const MIN_DROP_MS = 100;
export const GHOST_ALPHA = 0.2;

// Índice = tipo de pieza; nombres de variables CSS resueltos con getComputedStyle
export const COLORS = [
  null,
  "--cyan",
  "--yellow",
  "--magenta",
  "--green",
  "--bronze",
  "--silver",
  "--gold",
  "--ink-dim",
] as const;
export const GRID_COLOR = "--line-2";
export const FRAME_COLOR = "--line";
```

Reglas exactas (del original):

- ↓ con hueco debajo baja una fila y suma 1 punto; sin hueco, fija la pieza.
- ESPACIO suma `2 × filas recorridas` hasta la posición del fantasma y fija la pieza.
- Al limpiar `n` líneas: `score += LINE_SCORES[n] × nivel` (nivel anterior a la subida), `lines += n`, se recalcula nivel e intervalo.
- La caída automática baja una fila cuando el acumulador alcanza el intervalo y lo pone a 0; si no hay hueco, fija la pieza.
- Fijar = fusionar + limpiar líneas + aparecer la siguiente. Si la nueva pieza colisiona al aparecer → `gameover` y `onGameOver(score)`.
- `score` nunca supera `MAX_SCORE`.

Estado interno (no exportado):

```ts
type EngineState = "ready" | "playing" | "paused" | "gameover";
type Piece = { type: number; shape: number[][]; x: number; y: number };
// board: number[][] (ROWS × COLS), current, next, score, lines, level,
// dropAccum, dropInterval, lastTime, rafId, spaceArmed
```

Callbacks que emite CAÍDA, solo cuando el valor cambia: `onScore`, `onLevel`, `onStat("lines", n)`, `onGameOver`. No emite `onLives`.

### Supabase

```sql
-- supabase/migrations/<timestamp>_caida-playable.sql (npm run db:new caida-playable)
update public.games set playable = true where id = 'caida';
```

Regla de coherencia: los ids con `playable = true` en `games` (`rocas`, `caida`) son exactamente las claves de `PLAYABLE_GAMES`.

### Organización de ficheros

```
lib/games/types.ts                       (nuevo)
lib/games/registry.ts                    (nuevo)
lib/games/asteroids/types.ts             (cambia: sin AsteroidsCallbacks/AsteroidsGame)
lib/games/asteroids/engine.ts            (cambia: firma GameFactory, mismo comportamiento)
lib/games/caida/constants.ts             (nuevo)
lib/games/caida/entities.ts              (nuevo: rotateCW, collide, ghostY, drawBlock, drawBoard, drawNext)
lib/games/caida/engine.ts                (nuevo: createCaidaGame)
components/games/game-canvas.tsx         (nuevo)
components/games/asteroids-canvas.tsx    (se elimina)
components/game-player.tsx               (cambia: lee del registro)
lib/data.ts                              (cambia: long de caida)
supabase/migrations/<timestamp>_caida-playable.sql (nuevo)
```

## Plan de implementación

Cada paso deja la app compilando. Antes de tocar `GamePlayer` revisar en `node_modules/next/dist/docs/` lo relativo a componentes de cliente y `cacheComponents` (la página `/juego/[id]/jugar` debe seguir prerenderizándose).

1. Bootstrap del contrato: crear `lib/games/types.ts` y `lib/games/registry.ts` con solo `rocas`; adaptar `createAsteroidsGame` a `GameFactory`; crear `components/games/game-canvas.tsx` (callbacks en ref, motor creado en `useEffect`, `destroy()` en el cleanup, handle imperativo) y borrar `asteroids-canvas.tsx`. `GamePlayer` usa `getPlayableGame(game.id)` para modo real, vidas, nivel, stats extra, leyenda y `aria-label`; la casilla Vidas se oculta con `lives === null`. Verificar: `npx tsc --noEmit`, `npm run lint`, ROCAS jugable igual que antes y `/juego/caida/jugar` sigue simulado.
2. Constantes y entidades: crear `lib/games/caida/constants.ts` y `entities.ts` (`rotateCW`, `collide`, `ghostY` y funciones de dibujo que reciben `ctx` y colores resueltos). Verificar: tsc.
3. Motor: crear `lib/games/caida/engine.ts` con `createCaidaGame`. Input en `window` (`preventDefault` de flechas y ESPACIO solo en `playing` y sin foco en `input`/`textarea`/`contentEditable`), `spaceArmed` para ignorar el ESPACIO de inicio, bucle rAF con `dt` ≤ 50 ms y acumulador de caída, estados, puntuación con tope `MAX_SCORE` y callbacks solo al cambiar. Verificar: tsc y lint.
4. Dibujo: canvas 800×600 con backing store × `devicePixelRatio`, tablero en `BOARD_X`, rejilla, marco, recuadro "SIGUIENTE", fantasma, recolor y `shadowBlur` en la pieza activa. En `ready`, tablero y recuadro vacíos. Verificar: lint.
5. Registro: añadir `caida` a `PLAYABLE_GAMES`. Verificar: `npm run dev`, jugar en `/juego/caida/jugar` y comprobar que ROCAS sigue igual.
6. Catálogo: actualizar `long` de `caida` en `lib/data.ts`. Verificar: `/juego/caida` muestra el texto nuevo.
7. Supabase: `npm run db:new caida-playable`, escribir el `update`, `npm run db:push`. Verificar con MCP `execute_sql` (`select id, playable from public.games order by id;`) y `get_advisors` (security); `npm run db:types` no produce cambios.
8. Cierre: `npm run build`, `npx tsc --noEmit`, `npm run lint` y revisión manual de los criterios con capturas en `.playwright-screenshots/`.

## Criterios de aceptación

**Build y código:**

- [ ] `npm run build` termina sin errores y `/juego/[id]/jugar` sigue generándose para los 7 juegos.
- [ ] `npx tsc --noEmit` y `npm run lint` no reportan errores.
- [ ] `lib/games/caida/` no contiene `document.getElementById`, `localStorage` ni variables de módulo mutables.
- [ ] `components/game-player.tsx` no contiene comparaciones con ids de juegos concretos.
- [ ] `components/games/asteroids-canvas.tsx` ya no existe.
- [ ] Ningún texto visible de `/juego/caida` ni de `/juego/caida/jugar` contiene la palabra "Tetris".

**ROCAS sin regresiones:**

- [ ] ROCAS funciona exactamente igual que antes: overlay de inicio con su leyenda, HUD con 3 `♥` y Nivel 01, pausa, fin, guardado y "JUGAR DE NUEVO".

**CAÍDA — inicio y HUD:**

- [ ] Al entrar en `/juego/caida/jugar` se ve "PULSA ESPACIO PARA EMPEZAR" con la leyenda ← → mover · ↑ X rotar · ↓ bajar · ESPACIO caída.
- [ ] El HUD muestra Jugador, Puntuación 0, Líneas 0 y Nivel 01, sin casilla Vidas.
- [ ] Bajo el overlay de inicio el canvas muestra el tablero vacío con rejilla, marco y el recuadro "SIGUIENTE" vacío.
- [ ] Pulsar ESPACIO empieza la partida y la primera pieza no cae de golpe.

**CAÍDA — controles:**

- [ ] ← y → mueven la pieza una columna y no atraviesan bordes ni bloques.
- [ ] ↑ y X rotan la pieza en sentido horario; pegada a una pared, rota desplazándose hasta 2 columnas si hay hueco.
- [ ] Mantener pulsada ← → o ↓ repite el movimiento.
- [ ] Las flechas y ESPACIO no desplazan la página mientras se juega.
- [ ] `P` no pausa ni hace nada.

**CAÍDA — mecánicas y puntuación:**

- [ ] Aparecen las 8 piezas, incluida la tuerca (anillo 3×3 con hueco central).
- [ ] La pieza fantasma se ve al 20 % de opacidad en la posición de aterrizaje.
- [ ] La pieza siguiente se muestra en el recuadro "SIGUIENTE" y es la que aparece al fijar la actual.
- [ ] Cada fila bajada con ↓ suma exactamente 1 punto.
- [ ] Un hard drop que recorre N filas suma exactamente 2 × N puntos.
- [ ] En nivel 1, limpiar 1, 2, 3 o 4 líneas a la vez suma 100, 300, 500 u 800 puntos, y Líneas sube en 1, 2, 3 o 4.
- [ ] En nivel 2, limpiar 1 línea suma 200 puntos.
- [ ] Al llegar a 10 líneas el Nivel del HUD pasa a 02 y la caída automática es más rápida.
- [ ] La puntuación del HUD nunca supera 9.999.999.

**CAÍDA — aspecto:**

- [ ] El canvas no pinta puntuación, líneas, nivel, "GAME OVER", "PAUSA" ni botón de reinicio.
- [ ] Cada tipo de pieza usa su variable: I cian, O amarilla, T magenta, S verde, Z bronce, J plata, L oro, tuerca `--ink-dim`.
- [ ] Solo la pieza activa tiene glow.
- [ ] El canvas ocupa `.crt-screen` en 4:3 con el tablero a altura completa y se ve nítido con `devicePixelRatio` 2.

**CAÍDA — flujo de partida:**

- [ ] PAUSA congela la caída y muestra "EN PAUSA"; con pausa las teclas no mueven la pieza; REANUDAR continúa sin que la pieza salte filas.
- [ ] Cuando una pieza nueva no cabe al aparecer, se abre "FIN DEL JUEGO" con la puntuación final y ninguna tecla reinicia.
- [ ] FIN durante la partida detiene el juego y abre el modal con la puntuación actual.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = 'caida'` y aparece en `/salon?juego=caida` sin reiniciar el servidor.
- [ ] "JUGAR DE NUEVO" vuelve al overlay de inicio con Puntuación 0, Líneas 0, Nivel 01 y el tablero vacío.
- [ ] Al pulsar SALIR o VOLVER AL VAULT no quedan bucles ni listeners activos (las flechas vuelven a hacer scroll, sin errores en consola).
- [ ] En un dispositivo táctil sin teclado el overlay muestra "REQUIERE TECLADO".

**Catálogo y Supabase:**

- [ ] La descripción larga de CAÍDA en `/juego/caida` menciona la pieza tuerca y la pieza fantasma.
- [ ] `games` tiene `playable = true` exactamente para `caida` y `rocas`, que son las claves de `PLAYABLE_GAMES`.
- [ ] Existe una única migración nueva y `npm run db:types` no produce cambios.
- [ ] `get_advisors` (security) no reporta avisos nuevos.
- [ ] Los juegos que siguen simulados (p. ej. `/juego/serpentina/jugar`) muestran "MODO DEMO · NO PUNTÚA".
- [ ] `/salon` sigue abriendo ROCAS por defecto.

## Decisiones

- **Sí:** reutilizar la ficha `caida`. URL, portada `cover-tetro` y fila en `games` ya existen.
- **No:** ficha nueva. Duplicaría un juego de piezas y CAÍDA seguiría simulada.
- **Sí:** publicar el port como CAÍDA, con nombre, recolor y textos propios, y carpeta de motor `lib/games/caida/`. Ningún texto visible usa el nombre del juego original.
- **Sí:** registro genérico `PLAYABLE_GAMES` y migración de ROCAS en esta spec. Cada juego futuro solo se registra.
- **No:** segunda rama `if` en `GamePlayer`. Cada juego añadiría otra rama y otro componente canvas.
- **Sí:** port a TypeScript como motor `create…/destroy`. Limpieza garantizada al navegar y tipos estrictos.
- **No:** iframe o `next/script` con el original. Deja globals y listeners vivos y aísla los estilos del CRT.
- **Sí:** conservar la tuerca N con sorteo uniforme de 8 piezas. Port fiel y personalidad propia.
- **No:** bolsa de 7 piezas, hold, rotación antihoraria, DAS propio. No existen en el original.
- **Sí:** canvas 800×600 con tablero centrado y recuadro "SIGUIENTE" en el mismo canvas. Encaja en el CRT 4:3 sin perder la vista previa.
- **No:** solo tablero (pierde la vista previa) ni pieza siguiente en el HUD React (obligaría a ampliar el contrato con `onNext`).
- **Sí:** la pieza siguiente se queda en el canvas. Es estado efímero del juego, como el `3x` de ROCAS.
- **Sí:** ESPACIO inicia y el motor ignora esa pulsación con `spaceArmed`. Mantiene la convención "PULSA ESPACIO" sin soltar la primera pieza.
- **No:** iniciar con ENTER. Rompe la convención y obligaría a ampliar `startKey`.
- **Sí:** HUD con Puntuación, Líneas y Nivel, Vidas oculta (`lives: null`). Líneas entra como stat extra vía `onStat`.
- **No:** casilla Vidas con "—". Ocupa espacio sin información.
- **Sí:** paleta completa del sitio para las 8 piezas. Cada pieza tiene color propio dentro de la estética neón.
- **No:** solo 4 colores neón (piezas distintas compartirían color) ni los hex originales (no encajan con el CRT).
- **Sí:** glow solo en la pieza activa. Destaca lo que se controla y limita el coste de `shadowBlur`.
- **Sí:** ↑ y X rotan, como el original. **Sí:** repetición de tecla del sistema operativo, sin DAS propio.
- **Sí:** pieza fantasma al 20 %. Está en el original.
- **Sí:** en `ready`, tablero vacío con rejilla y marco. **No:** escombros decorativos; lógica extra sin valor de juego.
- **Sí:** tope `MAX_SCORE` en el motor. Guardar nunca falla por rango aunque sea casi inalcanzable.
- **No:** pausa con `P`, selector de tema ni `localStorage` propio. La pausa la gestiona la plataforma, el tema es el del sitio y las puntuaciones van a Supabase.
- **No:** sonido. El original no lo tiene.
- **No:** cambiar `DEFAULT_HALL_GAME`. ROCAS sigue siendo la pestaña por defecto del Salón.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| La generalización del contrato rompe ROCAS                            | Paso 1 aislado con verificación de ROCAS antes de crear el motor de CAÍDA; criterio explícito.    |
| El ESPACIO de inicio llega al motor y suelta la primera pieza         | `spaceArmed` en `false` al hacer `start()`; solo se arma con un `keyup` de ESPACIO.               |
| Strict Mode monta el efecto dos veces y crea dos bucles               | `destroy()` idempotente en el cleanup.                                                            |
| Callbacks a 60 fps provocan re-renders del HUD                        | El motor emite solo cuando el valor cambia.                                                       |
| Recrear el motor al cambiar los callbacks reinicia la partida         | Callbacks en una ref; el `useEffect` no depende de ellos.                                         |
| `preventDefault` bloquea el input "TUS INICIALES" del modal           | Ignorar teclas con foco en `input`/`textarea`/`contentEditable` o fuera de `playing`.             |
| `dt` grande al reanudar adelanta la caída                             | `resume()` reinicia `lastTime`; `dt` ≤ 50 ms.                                                     |
| Variables CSS no resueltas en el canvas                               | `getComputedStyle(document.documentElement)` al crear el motor.                                   |
| El rótulo "SIGUIENTE" se pinta antes de cargar la fuente pixel        | Usar la familia resuelta de `--pixel` con fallback `monospace`; es un rótulo, no un dato.         |
| Un hard drop en el mismo frame que la caída automática fija dos veces | Fijar y aparecer la siguiente pieza de forma síncrona en el handler; el bucle usa la pieza nueva. |
| El canvas vuelve dinámica la página con `cacheComponents`             | Motor en componente cliente; la página sigue siendo Server Component.                             |
| Registro y `games.playable` desincronizados                           | Criterio de coherencia y una migración por juego.                                                 |

## Qué **no** está en esta spec

- Sonido.
- Controles táctiles.
- Atajos de pausa y auto-pausa.
- Mecánicas que no existan en el original (hold, bolsa de 7, DAS, T-spins, combos).
- Selector de tema en el juego.
- Cambios de portada, `short`, `best` o `plays` de CAÍDA.
- Cambiar la pestaña por defecto del Salón.
- Auth real, anti-trampas y rate limit.
- Ranking real en el detalle de juego y en la Home.
- Port de los demás juegos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propia spec.
