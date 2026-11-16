# Integración con el leaderboard (Supabase)

Extraído de SPEC 06 (`specs/06-leaderboard-supabase.md`). La infraestructura ya existe; un juego nuevo **no** crea tablas ni acciones nuevas. Comprueba el estado real en `supabase/migrations/` y `lib/leaderboard/` antes de citarlo.

## Lo que ya existe y se reutiliza sin cambios

- Tablas `public.games (id, title, playable)` y `public.scores (id, game_id, player_name, score, created_at)` con `CHECK` de nombre `^[A-Z0-9_]{1,10}$` y score `0..9999999`.
- Vista `public.leaderboard` (`security_invoker`): mejor marca por `(game_id, player_name)` con `rank`.
- RLS: `insert` anónimo en `scores` **solo si `games.playable`** para ese `game_id`. Sin `update`/`delete`.
- `lib/leaderboard/actions.ts`: `submitScore({ game, score, name })` (valida, inserta, invalida `leaderboard:<game>`) y `getPlayerBest(game, name)`.
- `lib/leaderboard/queries.ts`: `getTopScores(gameId)` con `'use cache'` + `cacheTag("leaderboard:<gameId>")`.
- `lib/leaderboard/validation.ts`: `normalizePlayerName`, `parseSubmitScore`, `NAME_RE`, `MAX_SCORE`.
- Salón (`components/hall-of-fame.tsx`): una pestaña por cada juego de `GAMES` (`/salon?juego=<id>`); `DEFAULT_HALL_GAME = "rocas"`.
- Modal "FIN DEL JUEGO": en juegos reales llama a `submitScore`; en simulados muestra "MODO DEMO · NO PUNTÚA". Con el registro genérico, "real" = está en `PLAYABLE_GAMES`.

## Lo que añade cada spec de juego

Una sola migración nueva, creada con `npm run db:new <id>-playable` y aplicada con `npm run db:push`:

- **Ficha existente** (ya sembrada en `games` con `playable = false`):
  ```sql
  update public.games set playable = true where id = '<id>';
  ```
- **Ficha nueva** (no existe en `games`):
  ```sql
  insert into public.games (id, title, playable) values ('<id>', '<TÍTULO>', true);
  ```

No cambia el esquema, así que `npm run db:types` no debe producir cambios (criterio de aceptación).

Regla de coherencia: el conjunto de ids con `playable = true` en `games` debe ser igual al de claves de `PLAYABLE_GAMES` en `lib/games/registry.ts`. Si el registro tiene un juego que la base no permite, guardar fallará con `not_playable`; si la base permite un juego simulado, se podrían insertar puntos aleatorios.

Si la puntuación máxima posible del juego pudiera superar `9.999.999`, la spec debe decidirlo explícitamente (limitar en el motor o cambiar el `CHECK` en otra spec).

## Verificación (MCP Supabase)

- `execute_sql`: `select id, playable from public.games order by id;` → el juego aparece con `playable = true`.
- Insert anónimo de prueba (vía la app, guardando una partida) aparece en `/salon?juego=<id>` sin reiniciar el servidor.
- `get_advisors` (security) sin avisos nuevos.
- No borrar puntuaciones reales para "limpiar" pruebas sin permiso del usuario.

## Fuera de scope por defecto (cada uno en su propia spec)

- Auth real y puntuaciones ligadas a usuarios.
- Anti-trampas / validación de partidas en servidor y rate limit.
- Ranking real en `/juego/[id]` y en la Home (siguen con datos mock).
- `best` / `plays` reales en las tarjetas.
- Cambiar `DEFAULT_HALL_GAME`, salvo decisión explícita en la Fase 2.
