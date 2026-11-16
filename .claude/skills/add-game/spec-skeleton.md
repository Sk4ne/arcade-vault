# Esqueleto de spec de juego

Base para la spec que genera `/add-game`. Sustituye cada `<marcador>`, borra lo que no aplique y añade lo específico del juego. Las partes marcadas **[bootstrap]** solo van si no existe `lib/games/registry.ts`. Las marcadas **[ficha nueva]** solo si el juego no reutiliza una ficha de `lib/data.ts`. Las marcadas **[port]** solo si viene de `references/started-games/`.

---

```markdown
# SPEC NN — <Juego original> jugable como "<TÍTULO>"

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06
> **Date:** <fecha del contexto>
> **Objective:** <Portar/Crear> <juego> como <TÍTULO> jugable en `/juego/<id>/jugar`, con el HUD, la pausa y el modal de la plataforma y sus puntuaciones en el Salón de la Fama.

## Por qué existe esta spec

<Estado actual de la ficha (simulada con puntos aleatorios). [port] Qué impide cargar el original tal cual (globals, DOM, listeners). [bootstrap] Por qué hay que generalizar el contrato de ROCAS ahora.>

## Scope

**In:**

- [bootstrap] Contrato genérico `lib/games/types.ts` (`GameCallbacks`, `GameEngine`, `GameFactory`, `PlayableGame`) y registro `lib/games/registry.ts` con `getPlayableGame(id)`.
- [bootstrap] `components/games/game-canvas.tsx` genérico; ROCAS migra al contrato sin cambiar su comportamiento; se elimina `components/games/asteroids-canvas.tsx`.
- [bootstrap] `GamePlayer` sin `if (game.id === …)`: vidas, nivel, stats extra y leyenda de controles desde el registro.
- Motor en `lib/games/<motor>/` con `create<Motor>Game(canvas, callbacks)`: <mecánicas conservadas con constantes reales>.
- Mundo lógico <W>×<H> <escalado 4:3 / letterbox centrado>, backing store × `devicePixelRatio`.
- Recolor neón: <elemento → variable CSS>.
- Se elimina del canvas <HUD, GAME OVER, overlays>; se conserva <estado efímero>.
- Entrada `<id>` en `PLAYABLE_GAMES` con vidas <n|null>, nivel <sí/no>, stats extra <…> y controles <…>.
- HUD React: <Puntuación, Vidas, Nivel, …>.
- Overlay "PULSA ESPACIO PARA EMPEZAR" con la leyenda: <teclas · acción>.
- [port] Assets en `public/games/<id>/` <o: sin assets, geometría vectorial>.
- [ficha nueva] Ficha `<id>` en `lib/data.ts` y portada `.cover-<id>` en `app/globals.css`.
- [ficha existente] Ajustar `long`/`short` de `<id>` en `lib/data.ts` <si aplica>.
- Migración `supabase/migrations/<timestamp>_<id>-playable.sql`: <update/insert> de `games` con `playable = true`.

**Out of scope (para futuras specs):**

- Controles táctiles en pantalla.
- Sonido <si se decidió fuera>.
- Atajos de pausa (P / Esc) y auto-pausa al ocultar la pestaña.
- Mecánicas que no existan en el original.
- Auth real, anti-trampas y rate limit.
- Ranking real en `/juego/[id]` y en la Home; `best`/`plays` reales.
- Modificar `references/started-games/<carpeta>/`.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

<Constantes reales (`W`, `H`, puntos, velocidades, `COLORS`), [bootstrap] tipos genéricos de `contract.md`, entrada del registro, SQL de la migración y árbol de ficheros.>

## Plan de implementación

Cada paso deja la app compilando. Antes de tocar `GamePlayer` revisar en `node_modules/next/dist/docs/` lo relativo a componentes de cliente y `cacheComponents`.

0. [bootstrap] Contrato genérico y registro con ROCAS; `game-canvas.tsx`; `GamePlayer` lee del registro. Verificar: `npx tsc --noEmit`, `npm run lint` y ROCAS jugable igual que antes.
1. Constantes y entidades en `lib/games/<motor>/`. Verificar: tsc.
2. Motor `create<Motor>Game`: input, bucle, estados, callbacks solo al cambiar. Verificar: tsc y lint.
3. Recolor, escalado y dpr <y letterbox>. Verificar: lint.
4. [port] Assets en `public/games/<id>/` y carga en el motor. Verificar: tsc.
5. Registro: entrada `<id>` en `PLAYABLE_GAMES`. Verificar: `npm run dev`, jugar en `/juego/<id>/jugar`.
6. Catálogo: [ficha nueva] ficha y portada / [ficha existente] textos. Verificar: `/games` y `/juego/<id>`.
7. Supabase: `npm run db:new <id>-playable`, escribir el SQL, `npm run db:push`. Verificar con MCP `execute_sql` y `get_advisors`.
8. Cierre: `npm run build`, `npx tsc --noEmit`, `npm run lint` y revisión manual de los criterios con capturas en `.playwright-screenshots/`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `/juego/[id]/jugar` sigue generándose para todos los juegos.
- [ ] `npx tsc --noEmit` y `npm run lint` no reportan errores.
- [ ] `lib/games/<motor>/` no contiene `document.getElementById` ni variables de módulo mutables.
- [ ] [bootstrap] `components/game-player.tsx` no contiene comparaciones con ids de juegos concretos.
- [ ] [bootstrap] ROCAS funciona exactamente igual que antes (inicio, HUD, pausa, fin, guardado).
- [ ] Al entrar en `/juego/<id>/jugar` se ve "PULSA ESPACIO PARA EMPEZAR" con la leyenda <…> y el HUD muestra <valores iniciales>.
- [ ] Al pulsar ESPACIO empieza la partida y <cada tecla> hace <acción>.
- [ ] Las teclas del juego no desplazan la página mientras se juega.
- [ ] <Acción> suma exactamente <N> puntos en el HUD React. (uno por regla de puntuación)
- [ ] <Condición> sube el Nivel del HUD en 1. (si aplica)
- [ ] <Condición> resta una vida del HUD. (si aplica)
- [ ] El canvas no pinta <HUD/GAME OVER eliminados>.
- [ ] Los elementos del juego usan colores de la paleta neón del sitio.
- [ ] El canvas ocupa `.crt-screen` en 4:3 <con letterbox centrado> y se ve nítido con `devicePixelRatio` 2.
- [ ] PAUSA congela el juego y muestra "EN PAUSA"; REANUDAR continúa sin saltos.
- [ ] <Condición de fin> abre "FIN DEL JUEGO" con la puntuación final y ninguna tecla reinicia.
- [ ] FIN durante la partida detiene el juego y abre el modal con la puntuación actual.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = '<id>'` y aparece en `/salon?juego=<id>` sin reiniciar el servidor.
- [ ] "JUGAR DE NUEVO" vuelve al overlay de inicio con el HUD en sus valores iniciales.
- [ ] Al pulsar SALIR o VOLVER AL VAULT no quedan bucles ni listeners activos (las flechas vuelven a hacer scroll, sin errores en consola).
- [ ] En un dispositivo táctil sin teclado el overlay muestra "REQUIERE TECLADO".
- [ ] `games` tiene `playable = true` para `<id>` y los ids `playable` coinciden con las claves de `PLAYABLE_GAMES`.
- [ ] `npm run db:types` no produce cambios.
- [ ] Los juegos que siguen simulados muestran "MODO DEMO · NO PUNTÚA".
- [ ] [ficha nueva] La tarjeta aparece en `/games`, la ficha en `/juego/<id>` y la pestaña en `/salon?juego=<id>`.

## Decisiones

- **Sí:** port a TypeScript como motor `create…/destroy`. Limpieza garantizada al navegar y tipos estrictos.
- **No:** iframe o `next/script` con el original. Deja globals y listeners vivos y aísla los estilos del CRT.
- **Sí:** la plataforma pinta HUD y fin de partida. Una sola fuente visual y el guardado en Supabase ya existente.
- **Sí:** mundo lógico fijo con escalado CSS. Misma dificultad en cualquier pantalla.
- [bootstrap] **Sí:** registro genérico `PLAYABLE_GAMES`. Cada juego nuevo solo se registra. **No:** una rama `if` por juego en `GamePlayer`.
- **Sí/No:** <decisiones de la Fase 2: ficha, aspecto, assets, sonido, mecánicas descartadas…>.

## Riesgos

| Riesgo                                                        | Mitigación                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Strict Mode monta el efecto dos veces y crea dos bucles       | `destroy()` idempotente en el cleanup.                                   |
| Callbacks a 60 fps provocan re-renders del HUD                | El motor emite solo cuando el valor cambia.                              |
| Recrear el motor al cambiar los callbacks reinicia la partida | Callbacks en una ref; el `useEffect` no depende de ellos.                |
| `preventDefault` bloquea el input "TUS INICIALES" del modal   | Ignorar teclas con foco en `input`/`textarea` o fuera de `playing`.      |
| `dt` grande al reanudar provoca saltos                        | `resume()` reinicia `lastTime`; `dt` ≤ 50 ms.                            |
| Variables CSS no resueltas en el canvas                       | `getComputedStyle(document.documentElement)` al crear el motor.          |
| El canvas vuelve dinámica la página con `cacheComponents`     | Motor en componente cliente; la página sigue siendo Server Component.    |
| Registro y `games.playable` desincronizados                   | Criterio de coherencia y una migración por juego.                        |
| [bootstrap] La generalización rompe ROCAS                     | Paso 0 aislado con verificación de ROCAS antes de añadir el juego nuevo. |

## Qué **no** está en esta spec

- <repetición de Out of scope>

Cada uno de ellos, si se aborda, va en su propia spec.
```
