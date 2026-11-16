# Analizar un juego de referencia (o diseñar uno nuevo)

## Referencias conocidas

| Carpeta                                 | Ficha sugerida  | Estado                                   | Notas del original                                                                                                                                                                                                             |
| --------------------------------------- | --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `references/started-games/02-asteroids` | `rocas`         | Implementado (SPEC 05/06), es el ejemplo | Canvas 800×600, rAF, HUD y GAME OVER pintados en canvas, ESPACIO reinicia.                                                                                                                                                     |
| `references/started-games/03-tetris`    | `caida`         | Pendiente                                | Tablero 300×600 (10×20, bloque 30) **vertical**, canvas aparte para la pieza siguiente, HUD en DOM (`score`, `lines`, `level`), overlay y botón de reinicio en HTML, `style.css`.                                              |
| `references/started-games/04-arkanoid`  | `bloque-buster` | Pendiente                                | Canvas 800×600, `levels.js`, spritesheet (`assets/spritesheet-breakout.png` + `spritesheet.js`), sonidos mp3, ratón (`click`/`mousemove`) y teclado, pausa con selector de nivel pintada en canvas, specs propias en `specs/`. |

Las carpetas nuevas que aparezcan en `references/started-games/` se analizan con el mismo checklist. Si no hay ficha que encaje, se crea una nueva.

## Checklist de análisis del original

Lee el código completo (no solo el README) y anota en la spec, con nombres reales:

1. **Estado global:** variables de módulo mutables → pasan a ser estado interno de `create<Motor>Game`.
2. **DOM:** `document.getElementById`, elementos HUD en HTML, overlays, botones → se eliminan; el HUD lo pinta React.
3. **Listeners:** en `window`, `document` o `canvas` (teclado, ratón) → se registran en el motor y se quitan en `destroy()`. Decide si el ratón entra en scope.
4. **Bucle:** `requestAnimationFrame`, `setInterval` o ticks de caída → rAF con `dt` ≤ 50 ms y acumuladores.
5. **Dimensiones:** tamaño del canvas y del mundo; si no es 4:3, decide cómo encaja en el CRT.
6. **HUD/overlays en canvas:** qué se elimina (puntuación, vidas, nivel, GAME OVER, pausa propia) y qué estado efímero se queda.
7. **Teclas:** lista exacta (copiada del `switch`/`if` del original), teclas de reinicio y de pausa propias → se eliminan.
8. **Puntuación:** tabla exacta de puntos por acción, multiplicadores por nivel, condición de subida de nivel.
9. **Fin de partida:** condición exacta → `onGameOver(score)`.
10. **Assets:** imágenes, spritesheets, sonidos → `public/games/<id>/` o recolor vectorial.
11. **Persistencia propia:** `localStorage` de high-score → se elimina (Supabase).
12. **Colores:** paleta original → mapeo a `--cyan`, `--magenta`, `--yellow`, `--green`.
13. **Código muerto o mecánicas no implementadas:** no se añaden mecánicas que el original no tenga, salvo decisión explícita.

## Juego nuevo (sin referencia)

Antes de escribir la spec, cierra con el usuario:

- Concepto en una frase y género (ARCADE, PUZZLE, SHOOTER, VERSUS).
- Mecánica principal, objetivo y condición de derrota.
- Tabla de puntuación y progresión (niveles, velocidad).
- Controles de teclado y entidades principales.
- Ficha nueva: `id` (slug), `title` en mayúsculas, `short`, `long`, `cat`, `color` y descripción de la portada CSS `cover-<id>` (seguir el estilo de las portadas existentes en `app/globals.css` y usar `/frontend-design`).

El juego debe ser original: géneros y mecánicas conocidas sí; nombre, personajes, arte, música o niveles de un juego existente, no.

El motor se escribe directamente siguiendo `contract.md`; no hay paso de "port".

## Ficha nueva en el catálogo

Si se crea ficha, la spec incluye:

- Entrada en `GAMES` de `lib/data.ts` (tipo `Game`: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`). `best`/`plays` siguen siendo mock (fuera de scope calcularlos).
- Clase `.cover-<id>` (y `::before`/`::after` si hace falta) en `app/globals.css`, junto al resto de portadas.
- `insert` en `public.games` con `playable = true` (ver `leaderboard.md`).
- Criterio: la tarjeta aparece en `/games`, la ficha en `/juego/<id>` y la pestaña en `/salon?juego=<id>`.
