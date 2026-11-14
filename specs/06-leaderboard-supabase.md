# SPEC 06 — Leaderboard y tabla de juegos en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-11-14
> **Objective:** Crear en Supabase las tablas `games` y `scores`, guardar las puntuaciones de juegos reales mediante una Server Action y mostrar el ranking real por juego en el Salón de la Fama (`/salon`).

## Por qué existe esta spec

SPEC 04 conectó la app a Supabase, pero la base sigue vacía. Las puntuaciones viven en `localStorage` (`av_scores`), y nadie las lee. El Salón (`components/hall-of-fame.tsx`) muestra filas inventadas con `seededScores`, y "TU MEJOR MARCA" es un número calculado. Con ROCAS ya jugable (SPEC 05), existe la primera puntuación real que merece un ranking real. Todavía no hay auth real, así que la escritura es anónima. Pasa por una Server Action que valida, y la base aplica de nuevo las mismas reglas con restricciones y RLS.

## Scope

**In:**

- Migración SQL versionada en `supabase/migrations/` con:
  - Tabla `games` (`id`, `title`, `playable`) sembrada con los 7 juegos de `lib/data.ts`; solo `rocas` con `playable = true`.
  - Tabla `scores` (`id`, `game_id` → `games.id`, `player_name`, `score`, `created_at`) con `CHECK` de nombre y rango de puntuación.
  - Índice `(game_id, score desc, created_at)`.
  - Vista `leaderboard` (`security_invoker`): mejor marca por `(game_id, player_name)` con `rank` por juego (`score desc`, empate → `created_at asc`).
  - RLS: lectura pública de `games`, `scores` y la vista; `insert` anónimo en `scores` solo si el juego es `playable`; sin `update` ni `delete`.
- Tipos regenerados con `npm run db:types`.
- Cliente sin cookies `lib/supabase/public.ts` para lecturas dentro de `'use cache'`.
- Lectura cacheada `getTopScores(gameId)` (top 10 de la vista) con `cacheTag("leaderboard:<gameId>")`.
- Server Action `submitScore({ game, score, name })`: valida, inserta e invalida el tag del juego.
- Server Action `getPlayerBest(game, name)`: devuelve la mejor marca y el rango de ese nombre, o `null`.
- Validación compartida en `lib/leaderboard/validation.ts`: nombre `^[A-Z0-9_]{1,10}$` tras normalizar; score entero entre 0 y 9.999.999.
- Salón (`/salon`):
  - Pestañas como enlaces a `/salon?juego=<id>`; sin parámetro o con id desconocido se muestra `rocas`.
  - Podio y tabla (top 10) con datos reales, dentro de `<Suspense>` con fallback "CARGANDO RANKING…".
  - Estado vacío: "SIN PUNTUACIONES TODAVÍA" en la tabla y `---` en los huecos del podio.
  - Huecos del podio con `---` cuando hay menos de 3 jugadores.
  - Estado de error: "NO SE PUDO CARGAR EL RANKING" si falla la consulta; la página no se cae.
  - Fecha en formato `dd/mm/aaaa` desde `created_at`.
  - Fila "TU MEJOR MARCA EN <JUEGO>" real vía `getPlayerBest` con el `user.name` normalizado; si no hay sesión o no hay marca, no se muestra.
- Modal "FIN DEL JUEGO" en `components/game-player.tsx`:
  - Juegos reales (`rocas`): "GUARDAR PUNTUACIÓN" llama a `submitScore`.
  - Mientras guarda: botón "GUARDANDO…" deshabilitado.
  - Si falla: "NO SE PUDO GUARDAR · REINTENTAR" y el botón vuelve a estar activo.
  - Si va bien: el toast actual "▸ PUNTUACIÓN GUARDADA_".
  - El input de iniciales solo acepta `A–Z`, `0–9` y `_` (máx. 10, en mayúsculas).
  - Juegos simulados: sin input ni botón de guardar; se muestra "MODO DEMO · NO PUNTÚA".
- `components/user-provider.tsx`: se elimina `saveScore`, el tipo `SavedScore` y la escritura en `av_scores`.

**Out of scope (para futuras specs):**

- Auth real con Supabase y asociar puntuaciones a usuarios.
- Rate limit por IP o anti-trampas (firma de partidas, validación de score en servidor).
- Leer el catálogo (biblioteca, detalle, `generateStaticParams`) desde la tabla `games`; `lib/data.ts` sigue siendo la fuente del catálogo UI.
- Ranking real en `/juego/[id]` (sigue con `seededScores`).
- `RECENT_SCORES` y `TOP_PLAYERS` reales en la Home.
- Calcular `best` o `plays` de las tarjetas desde Supabase.
- Migrar o borrar las entradas antiguas de `av_scores` en navegadores existentes.
- Datos de ejemplo (seed de puntuaciones).
- Ranking global entre juegos.
- Paginación del ranking más allá del top 10.
- Realtime.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_leaderboard.sql
create table public.games (
  id        text primary key,            -- mismo slug que lib/data.ts
  title     text not null,
  playable  boolean not null default false
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,10}$'),
  score       integer not null check (score between 0 and 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

-- Mejor marca por jugador y juego, con rango único por juego
create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, score, created_at,
       row_number() over (partition by game_id order by score desc, created_at asc) as rank
from (
  select distinct on (game_id, player_name) game_id, player_name, score, created_at
  from public.scores
  order by game_id, player_name, score desc, created_at asc
) best;
```

RLS (resumen):

| Objeto   | `select`                | `insert`                                                   | `update` / `delete` |
| -------- | ----------------------- | ---------------------------------------------------------- | ------------------- |
| `games`  | `anon`, `authenticated` | —                                                          | —                   |
| `scores` | `anon`, `authenticated` | `anon`, `authenticated` si `games.playable` para `game_id` | —                   |

Seed de `games` dentro de la misma migración: los 7 ids y títulos de `lib/data.ts`, `playable = true` solo en `rocas`.

Tipos TypeScript:

```ts
// lib/leaderboard/types.ts
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "dd/mm/aaaa"
};

export type SubmitScoreInput = { game: string; score: number; name: string };
export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_playable" | "unavailable" };

export type TopScoresResult =
  { ok: true; rows: LeaderboardRow[] } | { ok: false };

// lib/leaderboard/validation.ts
export const NAME_RE = /^[A-Z0-9_]{1,10}$/;
export const MAX_SCORE = 9_999_999;
export function normalizePlayerName(raw: string): string; // mayúsculas, quita caracteres no válidos, corta a 10
export function parseSubmitScore(input: unknown): SubmitScoreInput | null;

// lib/leaderboard/queries.ts — 'use cache' + cacheTag(`leaderboard:${gameId}`)
export async function getTopScores(gameId: string): Promise<TopScoresResult>;

// lib/leaderboard/actions.ts — 'use server'
export async function submitScore(
  input: SubmitScoreInput,
): Promise<SubmitScoreResult>;
export async function getPlayerBest(
  game: string,
  name: string,
): Promise<LeaderboardRow | null>;

// lib/supabase/public.ts — sin cookies, apto para 'use cache'
export function createPublicClient(): SupabaseClient<Database>;
```

Organización de ficheros:

```
supabase/migrations/<timestamp>_leaderboard.sql   (nuevo, vía npm run db:new leaderboard)
lib/supabase/database.types.ts                    (regenerado)
lib/supabase/public.ts                            (nuevo)
lib/leaderboard/types.ts                          (nuevo)
lib/leaderboard/validation.ts                     (nuevo)
lib/leaderboard/queries.ts                        (nuevo)
lib/leaderboard/actions.ts                        (nuevo)
app/salon/page.tsx                                (cambia)
components/hall-of-fame.tsx                       (cambia: server, recibe gameId)
components/hall/hall-board.tsx                    (nuevo: podio + tabla, server)
components/hall/player-best.tsx                   (nuevo: "use client", fila TU MEJOR MARCA)
components/game-player.tsx                        (cambia: modal de guardado)
components/user-provider.tsx                      (cambia: sin saveScore)
```

Convenciones:

- Tag de caché: `leaderboard:<gameId>` (p. ej. `leaderboard:rocas`).
- `submitScore` nunca devuelve mensajes internos de Supabase; solo los códigos de `SubmitScoreResult`.
- El juego por defecto del Salón es la constante `DEFAULT_HALL_GAME = "rocas"` en `components/hall-of-fame.tsx`.

## Plan de implementación

Cada paso deja la app compilando. Antes de los pasos 3–6, leer en `node_modules/next/dist/docs/` las guías de `cacheComponents`, `'use cache'`, `cacheTag`, `updateTag`/`revalidateTag`, Server Actions y `searchParams` con Suspense. Consultar la guía de RLS de Supabase (MCP `search_docs`) antes del paso 1.

1. Migración: `npm run db:new leaderboard` y escribir tablas, índice, vista, RLS y seed de `games`. Aplicar con `npm run db:push`. Verificar con el MCP: `list_tables` muestra `games` y `scores`; `get_advisors` (security) no reporta RLS desactivada ni vistas `security definer`.
2. Tipos y cliente público: `npm run db:types` y crear `lib/supabase/public.ts` (`createClient` de `@supabase/supabase-js`, sin sesión persistente). Verificar: `npx tsc --noEmit`.
3. Dominio: crear `lib/leaderboard/types.ts`, `validation.ts` y `queries.ts` (`getTopScores` con `'use cache'`, `cacheTag`, `order by rank limit 10`, mapeo a `LeaderboardRow`, `{ ok: false }` ante error). Verificar: tsc y lint.
4. Acciones: crear `lib/leaderboard/actions.ts` con `submitScore` (valida con `parseSubmitScore`, inserta, invalida `leaderboard:<game>`; error de FK/RLS → `not_playable`, otro error → `unavailable`) y `getPlayerBest`. Verificar: tsc y lint.
5. Salón: `app/salon/page.tsx` lee `searchParams.juego` dentro de `<Suspense>`; `hall-of-fame.tsx` pinta cabecera y pestañas como `<Link>`; `hall-board.tsx` pinta podio, tabla, estado vacío y estado de error; `player-best.tsx` pide `getPlayerBest` tras hidratar. Verificar: `npm run dev`, `/salon` y `/salon?juego=caida` muestran estado vacío.
6. Reproductor: en `game-player.tsx` sustituir `saveScore` por `submitScore` con estados "GUARDANDO…" y error con reintento; filtrar el input de iniciales; en simulados mostrar "MODO DEMO · NO PUNTÚA". Quitar `saveScore`/`SavedScore`/`av_scores` de `user-provider.tsx`. Verificar: jugar ROCAS, guardar y ver la fila en `/salon?juego=rocas`.
7. Cierre: `npm run build`, `npx tsc --noEmit`, `npm run lint` y revisión manual de los criterios con capturas en `.playwright-screenshots/`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y el resto de rutas (`/`, `/games`, `/juego/[id]`, `/juego/[id]/jugar`, `/about`, `/auth`) se generan igual que antes.
- [ ] `npx tsc --noEmit` y `npm run lint` no reportan errores.
- [ ] Existe una única migración nueva en `supabase/migrations/` y `npm run db:types` no produce cambios sobre la versión commiteada.
- [ ] La tabla `games` contiene 7 filas y solo `rocas` tiene `playable = true`.
- [ ] Un `insert` en `scores` con `player_name = 'abc'` o `score = -1` falla por `CHECK`.
- [ ] Un `insert` anónimo en `scores` con `game_id = 'caida'` falla por RLS.
- [ ] Un `update` o `delete` anónimo en `scores` no modifica ninguna fila.
- [ ] `get_advisors` (security) no reporta tablas sin RLS ni la vista `leaderboard` como `security definer`.
- [ ] Con la tabla `scores` vacía, `/salon` muestra la pestaña ROCAS activa, el podio con `---` y "SIN PUNTUACIONES TODAVÍA".
- [ ] `/salon?juego=noexiste` muestra el ranking de ROCAS.
- [ ] Cada pestaña es un enlace a `/salon?juego=<id>` y la pestaña activa coincide con la URL.
- [ ] Tras guardar en ROCAS una puntuación de 1200 como `NEO`, `/salon?juego=rocas` muestra `NEO` con `1.200` y la fecha de hoy en `dd/mm/aaaa`, sin reiniciar el servidor.
- [ ] Si `NEO` guarda 1200 y luego 800, el ranking muestra una sola fila de `NEO` con 1.200.
- [ ] Con 11 jugadores distintos guardados, la tabla muestra exactamente 10 filas ordenadas por puntuación descendente.
- [ ] Dos jugadores con la misma puntuación aparecen ordenados por fecha de guardado (el más antiguo primero).
- [ ] Con sesión iniciada como `NEO` y una marca guardada, aparece "TU MEJOR MARCA EN ROCAS" con su rango y puntuación reales; sin marca o sin sesión, esa fila no aparece.
- [ ] Mientras se guarda, el botón muestra "GUARDANDO…" y está deshabilitado.
- [ ] Con Supabase inalcanzable, guardar muestra "NO SE PUDO GUARDAR · REINTENTAR" y `/salon` muestra "NO SE PUDO CARGAR EL RANKING" sin error 500.
- [ ] El input de iniciales no admite espacios, minúsculas ni símbolos distintos de `_`, y no pasa de 10 caracteres.
- [ ] Llamar a `submitScore` con `score: 1.5`, `score: 10000000`, `name: ""` o `game: "noexiste"` devuelve `{ ok: false }` y no inserta nada.
- [ ] En `/juego/caida/jugar`, el modal de fin muestra "MODO DEMO · NO PUNTÚA" y no muestra input ni botón de guardar.
- [ ] Guardar una puntuación ya no escribe en `localStorage` `av_scores`.
- [ ] La respuesta de las Server Actions no contiene la URL del proyecto, claves ni mensajes internos de Supabase.
- [ ] `/juego/[id]` y la Home siguen mostrando sus rankings mock sin cambios.

## Decisiones

- **Sí:** tabla `games` en Supabase con seed de los 7 juegos. Da integridad referencial a `scores` y marca qué juegos puntúan.
- **No:** leer el catálogo UI desde `games`. Volvería dinámicas páginas hoy estáticas; `lib/data.ts` sigue siendo la fuente.
- **Sí:** columna `playable` en `games`. La base, y no solo el cliente, rechaza puntuaciones de juegos simulados.
- **No:** permitir guardar en juegos simulados. Llenaría el ranking de puntos aleatorios.
- **Sí:** escritura anónima mediante Server Action. Valida en servidor antes de tocar la base, sin esperar a la spec de Auth.
- **No:** `insert` directo desde el navegador. Menos control de validación y de los mensajes de error.
- **No:** esperar a Auth para guardar. ROCAS ya es jugable y el ranking real aporta valor ahora.
- **Sí:** validación doble (Server Action + `CHECK`/RLS). Si alguien llama a la API REST de Supabase directamente, la base sigue protegida.
- **No:** rate limit por IP en esta spec. Requiere piezas extra; se reconsidera si aparece abuso.
- **Sí:** ranking por mejor marca por nombre, top 10. Un jugador no puede llenar la tabla con varias partidas.
- **No:** todas las partidas como filas. Ranking dominado por quien más juega.
- **Sí:** empate → gana el más antiguo, con `row_number`. Rango único y estable.
- **Sí:** vista `leaderboard` con `security_invoker`. Una sola definición del ranking para el top 10 y para "TU MEJOR MARCA", respetando RLS.
- **No:** funciones RPC. Más superficie que una vista para dos lecturas simples.
- **Sí:** tabla vacía y estado vacío en UI. No hay datos falsos en producción.
- **No:** seed de puntuaciones mock. Mezclaría datos reales y ficticios.
- **Sí:** `'use cache'` + `cacheTag` invalidado por la Server Action. Lecturas rápidas y ranking fresco tras guardar.
- **No:** consulta dinámica en cada visita. Una consulta por visita sin necesidad.
- **Sí:** cliente `lib/supabase/public.ts` sin cookies. `cookies()` no se puede usar dentro de `'use cache'` y las lecturas son públicas.
- **Sí:** pestaña del Salón en `?juego=<id>`. Enlace compartible y una consulta por juego visitado.
- **No:** cargar los 7 rankings de golpe. Consultas innecesarias por cada visita.
- **Sí:** ROCAS como pestaña por defecto. Es el único juego que puede tener puntuaciones reales.
- **Sí:** "TU MEJOR MARCA" vía Server Action desde el cliente. El nombre vive en `localStorage` y solo se conoce tras hidratar.
- **No:** calcularla solo desde el top 10. Desaparecería para cualquier jugador fuera del top.
- **Sí:** Supabase reemplaza `av_scores`. Una sola fuente de verdad para las puntuaciones.
- **No:** migrar los `av_scores` antiguos. Son datos locales sin validar y nadie los leía.

## Riesgos

| Riesgo                                                                              | Mitigación                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Spam o puntuaciones falsas vía API REST con la publishable key                      | `CHECK` de nombre y rango, RLS solo para juegos `playable`, sin `update`/`delete`. Rate limit en otra spec. |
| `searchParams` vuelve dinámico todo `/salon` y rompe el build con `cacheComponents` | Lectura de `searchParams` dentro de `<Suspense>`; cabecera estática fuera.                                  |
| `cookies()` dentro de `'use cache'` lanza error                                     | Las lecturas cacheadas usan `lib/supabase/public.ts`, sin cookies.                                          |
| El Salón muestra datos viejos tras guardar                                          | `submitScore` invalida `leaderboard:<game>`; criterio "sin reiniciar el servidor".                          |
| La vista se crea como `security definer` y salta RLS                                | `with (security_invoker = true)`; verificación con `get_advisors`.                                          |
| `user.name` con espacios o minúsculas no casa con el `CHECK`                        | `normalizePlayerName` antes de enviar y antes de `getPlayerBest`.                                           |
| Proyecto Supabase pausado (plan gratuito)                                           | Estados de error en Salón y modal; la app no se cae.                                                        |
| Quitar `saveScore` rompe otros consumidores de `useUser`                            | `grep saveScore` antes de borrarlo; hoy solo lo usa `game-player.tsx`.                                      |

## Qué **no** está en esta spec

- Auth real y puntuaciones ligadas a usuarios.
- Rate limit y anti-trampas.
- Catálogo UI leído desde Supabase.
- Ranking real en el detalle de juego y en la Home.
- `best` y `plays` reales.
- Migración de `av_scores`.
- Seed de puntuaciones.
- Ranking global, paginación y Realtime.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propia spec.
