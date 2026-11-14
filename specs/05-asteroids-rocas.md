# SPEC 05 — Asteroids jugable como "ROCAS"

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-14
> **Objective:** Portar a TypeScript el juego Asteroids de `references/started-games/02-asteroids` y hacerlo jugable en `/juego/rocas/jugar` dentro del reproductor CRT, con el HUD, la pausa y el modal de fin de partida de la plataforma.

## Por qué existe esta spec

Hoy el reproductor (`components/game-player.tsx`) solo simula una partida: un `setInterval` suma puntos aleatorios sobre una arena animada con CSS. Este es el primer juego real de la plataforma. El original (`game.js`, 510 líneas) es un script con estado global, listeners en `window` y acceso directo a `document.getElementById('canvas')`, así que no se puede cargar tal cual en una app React con navegación cliente: al salir de la página dejaría el bucle y los listeners vivos. La spec fija también el contrato motor ↔ plataforma (callbacks y control) que reutilizarán los siguientes juegos.

## Scope

**In:**

- Port del motor a TypeScript en `lib/games/asteroids/`, sin globals ni acceso al DOM salvo el `<canvas>` y el `window` recibidos: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, mismas constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), mundo lógico fijo 800×600 con wrap toroidal, `dt` limitado a 50 ms, niveles (`3 + level` asteroides), 3 vidas con invencibilidad al reaparecer y power-up de triple disparo.
- API del motor: `createAsteroidsGame(canvas, callbacks)` que devuelve `{ start, pause, resume, reset, destroy }`. `destroy` cancela el `requestAnimationFrame` y elimina todos los listeners.
- Recolor neón: misma geometría vectorial con colores de la paleta del sitio (`--cyan`, `--magenta`, `--yellow`, `--green`) y `shadowBlur` para glow.
- Se elimina del canvas el HUD (`SCORE`, `NIVEL`, iconos de vida) y el overlay `GAME OVER`; solo se conserva en el canvas el indicador del power-up (`3x 4.2s`).
- Componente cliente `components/games/asteroids-canvas.tsx` que monta el `<canvas>`, crea el motor en un `useEffect` y lo destruye al desmontar.
- Canvas con resolución lógica 800×600 escalado por CSS al ancho de `.crt-screen` (ya es 4:3), con backing store multiplicado por `devicePixelRatio` para nitidez.
- `GamePlayer` elige el modo por `game.id`: `rocas` → canvas real; el resto de juegos mantiene la simulación actual sin cambios.
- En modo real, el HUD React (Jugador, Puntuación, Vidas, Nivel) refleja el estado del motor vía callbacks; Vidas muestra tantos `♥` como vidas restantes.
- Overlay React "PULSA ESPACIO PARA EMPEZAR" sobre el CRT con la leyenda de controles (← → rotar · ↑ propulsar · ESPACIO disparar). El motor no arranca hasta pulsar ESPACIO.
- PAUSA/REANUDAR llama a `pause()`/`resume()` del motor y muestra el overlay "EN PAUSA" existente.
- FIN detiene el motor y abre el modal "FIN DEL JUEGO" con la puntuación actual, guardable igual que hoy.
- Al perder la última vida, el motor llama a `onGameOver(score)` y se abre el mismo modal. ESPACIO ya no reinicia la partida.
- "JUGAR DE NUEVO" hace `reset()` del motor, pone a cero el HUD y vuelve al overlay "PULSA ESPACIO PARA EMPEZAR".
- Guardado con `saveScore({ game: "rocas", score, name })` del `UserProvider` existente (`localStorage` `av_scores`).
- `preventDefault` de `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space` mientras el juego está montado, para que la página no haga scroll.
- En dispositivos sin teclado (`(pointer: coarse)` sin `(any-pointer: fine)`) el overlay de inicio muestra "REQUIERE TECLADO".
- Ajustar `long` de `rocas` en `lib/data.ts`: quitar la mención a OVNIs y citar el triple disparo.

**Out of scope (para futuras specs):**

- Controles táctiles en pantalla.
- Atajos de teclado para pausa (P / Esc).
- Auto-pausa al ocultar la pestaña (`visibilitychange`).
- Sonido.
- OVNIs u otras mecánicas que no existan en el original.
- Port real de los otros 6 juegos del catálogo.
- Guardar puntuaciones en Supabase o leaderboard real; el Salón sigue con datos mock.
- Cambiar `best` o `plays` de `rocas` con datos reales.
- Rediseño del reproductor, de la portada `cover-rocas` o de la página de detalle.
- Modificar los ficheros de `references/started-games/02-asteroids/` (son solo referencia).
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

No hay persistencia nueva: se reutiliza `av_scores` (`SavedScore` de `components/user-provider.tsx`). Se introducen los tipos del contrato motor ↔ plataforma.

```ts
// lib/games/asteroids/types.ts
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

// Estado interno del motor (no exportado)
type EngineState = "ready" | "playing" | "dead" | "paused" | "gameover";

// lib/games/asteroids/engine.ts
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;

// lib/games/asteroids/constants.ts
export const W = 800;
export const H = 600;
// Nombres de variables CSS; el motor los resuelve con getComputedStyle al crearse
export const COLORS = {
  ship: "--cyan",
  bullet: "--yellow",
  asteroid: "--magenta",
  powerUp: "--green",
  particle: "--yellow",
} as const;
```

Estado del reproductor en modo real (`components/game-player.tsx`):

```ts
type Phase = "ready" | "playing" | "paused" | "over";
// score, lives, level vienen de los callbacks del motor
```

Organización de ficheros:

```
lib/games/asteroids/
  constants.ts   // W, H, RADII, SPEEDS, POINTS, POWERUP_*, TRIPLE_SPREAD, COLORS
  entities.ts    // Bullet, Asteroid, Ship, Particle, PowerUp (reciben ctx/input por parámetro)
  engine.ts      // createAsteroidsGame: input, bucle, colisiones, niveles
  types.ts
components/games/
  asteroids-canvas.tsx
```

## Plan de implementación

Cada paso deja la app compilando. Antes de tocar `GamePlayer` revisar en `node_modules/next/dist/docs/` lo relativo a componentes de cliente y `cacheComponents` (la página `/juego/[id]/jugar` debe seguir prerenderizándose).

1. Constantes y entidades: crear `lib/games/asteroids/constants.ts`, `types.ts` y `entities.ts` portando las clases de `game.js` a TypeScript estricto. Las entidades reciben `ctx` en `draw(ctx)` y no leen globals. Verificar: `npx tsc --noEmit`.
2. Motor: crear `engine.ts` con `createAsteroidsGame`. Input propio (`keys`/`justPressed`) con listeners en `window` que hacen `preventDefault` de las cuatro teclas del juego; bucle `requestAnimationFrame` con `dt` ≤ 50 ms; estados `ready`/`playing`/`dead`/`paused`/`gameover`; callbacks emitidos solo cuando el valor cambia. Sin HUD ni overlay en el canvas, salvo el indicador `3x` del power-up. En `ready` dibuja el campo de asteroides de fondo sin nave. Verificar: `npx tsc --noEmit` y `npm run lint`.
3. Recolor y escalado: aplicar `COLORS` (resueltos desde las variables CSS) con `shadowBlur`; ajustar el canvas a `800*dpr × 600*dpr` con `ctx.setTransform(dpr, …)` y `width: 100%` por CSS. Verificar: lint.
4. Componente: crear `components/games/asteroids-canvas.tsx` (`"use client"`) que recibe `callbacks` y una ref imperativa (`start/pause/resume/reset`), crea el motor en `useEffect` y llama a `destroy()` en el cleanup. Los callbacks se guardan en una ref para no recrear el motor en cada render. Verificar: tsc.
5. Integración en `GamePlayer`: si `game.id === "rocas"`, renderizar `AsteroidsCanvas` dentro de `.crt-screen` en lugar de `.game-arena`, desactivar el `setInterval` simulado y conectar HUD (score/lives/level), PAUSA, FIN, modal y "JUGAR DE NUEVO". Añadir el overlay "PULSA ESPACIO PARA EMPEZAR" con la leyenda de controles (y "REQUIERE TECLADO" en táctil). Los demás juegos no cambian. Verificar: `npm run dev`, jugar en `/juego/rocas/jugar` y comprobar `/juego/caida/jugar`.
6. Catálogo: actualizar `long` de `rocas` en `lib/data.ts`. Verificar: `/juego/rocas` muestra el texto nuevo.
7. Cierre: `npm run build`, `npx tsc --noEmit`, `npm run lint` y revisión manual de los criterios con capturas en `.playwright-screenshots/`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `/juego/[id]/jugar` sigue generándose para los 7 juegos.
- [ ] `npx tsc --noEmit` y `npm run lint` no reportan errores.
- [ ] `lib/games/asteroids/` no contiene `document.getElementById` ni variables de módulo mutables.
- [ ] Al entrar en `/juego/rocas/jugar` se ve el overlay "PULSA ESPACIO PARA EMPEZAR" con la leyenda de controles y el HUD muestra Puntuación 0, 3 `♥` y Nivel 01.
- [ ] Al pulsar ESPACIO empieza la partida: ← → rotan, ↑ propulsa, ESPACIO dispara.
- [ ] Las flechas y ESPACIO no desplazan la página mientras se juega.
- [ ] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos en el HUD React.
- [ ] Morir resta un `♥` del HUD; la nave reaparece parpadeando y es invencible durante ese tiempo.
- [ ] Al vaciar el campo de asteroides, el Nivel del HUD sube en 1 y aparecen `3 + nivel` asteroides grandes.
- [ ] El power-up de triple disparo aparece, se recoge y muestra `3x Ns` en el canvas mientras dura.
- [ ] El canvas no pinta `SCORE`, `NIVEL`, iconos de vida ni `GAME OVER`.
- [ ] Nave, balas, asteroides, power-up y partículas usan colores de la paleta neón del sitio.
- [ ] El canvas ocupa todo `.crt-screen` en 4:3 y se ve nítido en pantallas con `devicePixelRatio` 2.
- [ ] PAUSA congela el juego y muestra "EN PAUSA"; REANUDAR continúa sin saltos de posición.
- [ ] Al perder la tercera vida se abre "FIN DEL JUEGO" con la puntuación final y ESPACIO no reinicia.
- [ ] FIN durante la partida detiene el juego y abre el modal con la puntuación actual.
- [ ] "GUARDAR PUNTUACIÓN" añade a `av_scores` una entrada con `game: "rocas"` y la puntuación del modal.
- [ ] "JUGAR DE NUEVO" vuelve al overlay de inicio con Puntuación 0, 3 vidas y Nivel 01.
- [ ] Al pulsar SALIR o VOLVER AL VAULT no quedan bucles ni listeners activos (las flechas vuelven a hacer scroll y no hay errores en consola).
- [ ] En un dispositivo táctil sin teclado el overlay de inicio muestra "REQUIERE TECLADO".
- [ ] `/juego/caida/jugar` (y el resto de juegos) siguen con la simulación de puntos actual.
- [ ] La descripción larga de ROCAS en `/juego/rocas` ya no menciona OVNIs.

## Decisiones

- **Sí:** reusar la ficha `rocas` del catálogo. URL, portada y referencias de la Home ya existen.
- **No:** ficha nueva `asteroids` ni renombrar `rocas`. Duplicaría un juego o rompería URLs.
- **Sí:** port a TypeScript como motor con `create…/destroy`. Limpieza garantizada al navegar y tipos estrictos.
- **No:** iframe con los ficheros en `public/`. Comunicación por `postMessage` sin tipos y estilos aislados del CRT.
- **No:** cargar `game.js` con `next/script`. Deja globals, bucle y listeners vivos al cambiar de ruta.
- **Sí:** la plataforma pinta HUD y fin de partida. Una sola fuente visual y el guardado de puntuación ya existente.
- **Sí:** el indicador del power-up queda en el canvas. Es estado efímero del juego, no de la plataforma.
- **Sí:** recolor neón manteniendo la geometría. Encaja en el CRT sin cambiar la jugabilidad.
- **Sí:** mundo lógico fijo 800×600 con escalado CSS. La dificultad es la misma en cualquier pantalla.
- **No:** mundo adaptado al contenedor. Cambiaría la dificultad según el dispositivo.
- **Sí:** overlay "PULSA ESPACIO" antes de empezar. No se pierden vidas mientras carga y fija el foco en el teclado.
- **Sí:** FIN abre el modal y permite guardar. Mismo comportamiento que el simulador actual.
- **Sí:** "JUGAR DE NUEVO" vuelve al overlay de inicio en lugar de arrancar directamente. Mismo flujo que la primera partida.
- **Sí:** el resto de juegos sigue con la simulación. Cada port real tendrá su propia spec.
- **Sí:** solo teclado; aviso en táctil. Los controles táctiles son una spec aparte.
- **No:** atajos P/Esc, auto-pausa al ocultar la pestaña ni leyenda fija bajo el CRT. Descartados por el usuario; la leyenda vive en el overlay de inicio.
- **No:** sonido. El original no lo tiene.
- **Sí:** contrato de callbacks (`onScore`, `onLives`, `onLevel`, `onGameOver`). Base reutilizable para los siguientes juegos sin generalizarlo aún.

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces y crea dos bucles                    | `destroy()` idempotente en el cleanup; criterio de "sin listeners tras salir".                 |
| Callbacks a 60 fps provocan re-renders excesivos del HUD                         | El motor emite solo cuando el valor cambia.                                                    |
| Recrear el motor al cambiar los callbacks reinicia la partida                    | Callbacks guardados en una ref; el `useEffect` depende solo del canvas.                        |
| `preventDefault` global bloquea el input "TUS INICIALES" del modal               | Ignorar teclas cuando el foco está en un `input`/`textarea` o el motor no está en `playing`.   |
| `dt` grande al reanudar tras pausa provoca saltos                                | `resume()` reinicia `lastTime`; `dt` sigue limitado a 50 ms.                                   |
| `shadowBlur` penaliza el rendimiento con muchas partículas                       | Glow solo en nave, balas y asteroides; partículas sin blur.                                    |
| Variables CSS no resueltas en el canvas (`var(--cyan)` no vale en `strokeStyle`) | Resolver con `getComputedStyle(document.documentElement)` al crear el motor.                   |
| El canvas cambia la página a dinámica con `cacheComponents`                      | Todo el motor vive en un componente cliente; la página sigue siendo la misma Server Component. |

## Qué **no** está en esta spec

- Controles táctiles.
- Atajos de pausa y auto-pausa.
- Sonido.
- OVNIs y mecánicas nuevas.
- Port de los demás juegos.
- Puntuaciones en Supabase y leaderboard real.
- Rediseño del reproductor o de la portada.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propia spec.
