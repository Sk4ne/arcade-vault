---
name: add-game
description: Diseña la spec para portar (desde references/started-games/) o crear desde cero un juego jugable de Arcade Vault, integrado en el reproductor CRT, el HUD de la plataforma y el leaderboard de Supabase. Solo genera la spec; la implementación se hace con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*), Bash(wc:*), Bash(head:*), Bash(test:*)
---

# /add-game — Spec de un juego jugable con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay references/started-games/"`

Registro genérico de juegos:
!`test -f lib/games/registry.ts && grep -nE '^\s+"?[a-z-]+"?:\s*\{' lib/games/registry.ts || echo "NO EXISTE lib/games/registry.ts → la spec debe incluir el paso de bootstrap (ver contract.md)"`

Fichas del catálogo (`lib/data.ts`):
!`grep -nE '^\s+(id|title|cover):' lib/data.ts 2>/dev/null`

Juegos jugables en Supabase (migraciones):
!`grep -rnE "playable|', +true\)" supabase/migrations/ 2>/dev/null`

---

Este skill produce **una spec** (`specs/NN-<slug>.md`) para que un juego sea jugable de verdad en `/juego/<id>/jugar` y puntúe en el Salón (`/salon?juego=<id>`). **No escribes código.** La spec la implementa luego el usuario con `/spec-impl`.

Se apoya en dos specs ya implementadas, que son el patrón a repetir:

- `specs/05-asteroids-rocas.md` — port de un juego a motor TypeScript + integración con el reproductor.
- `specs/06-leaderboard-supabase.md` — tablas `games`/`scores`, `submitScore` y Salón real.

Ficheros de apoyo de este skill (léelos cuando se indique):

- `contract.md` — contrato motor ↔ plataforma y registro genérico (incluye el bootstrap).
- `leaderboard.md` — qué hay que tocar (y qué no) en Supabase y en el Salón.
- `porting.md` — cómo analizar un juego de `references/` o diseñar uno nuevo.
- `spec-skeleton.md` — esqueleto de la spec con plan, criterios y riesgos estándar.

Skill de referencia para crear specs (**lectura obligatoria antes de escribir la spec**, ver Fase 3):

- `../spec/SKILL.md` — método spec-driven del proyecto (`/spec`): fases, reglas de escritura, numeración, guardado y `specs/.spec-config.yml`.
- `../spec/template.md` — plantilla y reglas de formato de cada sección de una spec.

`/add-game` es una especialización de `/spec` para juegos: sigue sus reglas en todo lo que este skill no concrete. Si algo de aquí contradice `../spec/SKILL.md` en el formato o el guardado de la spec, manda `../spec/SKILL.md`; en lo específico de juegos (contrato, leaderboard, port), manda este skill.

Responde siempre en el idioma del prompt inicial. Las specs del repo están en español: la spec se escribe en español, con los mismos encabezados que SPEC 05/06 y los estados `Borrador` / `En revisión` / `Aprobado` / `Implementado` / `Obsoleto`.

## Fase 1 — Contexto

1. Lee `CLAUDE.md`, `specs/05-asteroids-rocas.md`, `specs/06-leaderboard-supabase.md`, `contract.md` y `leaderboard.md`.
2. Lee el estado real del código que vas a citar en la spec: `components/game-player.tsx`, `components/games/` y `lib/games/`. Si existe `lib/games/registry.ts`, léelo: el contrato genérico ya existe y **no** hay paso de bootstrap.
3. Si existen specs de juegos posteriores a la 06, léelas también: son ejemplos más recientes del patrón y pueden haber cambiado el contrato.
4. Determina el **modo**:
   - **Port:** `$ARGUMENTS` coincide (total o parcialmente, p. ej. `tetris` → `03-tetris`) con una carpeta de `references/started-games/`. Lee `porting.md` y después `README.md`, `CLAUDE.md`, `index.html`, `game.js` y cualquier otro `.js`, `assets/` o `specs/` de esa carpeta.
   - **Nuevo:** no hay carpeta de referencia. Lee `porting.md` (sección "Juego nuevo"). El juego debe ser **original**: se pueden usar géneros y mecánicas conocidas, pero no recrear un juego concreto existente (nombre, personajes, arte, música o niveles).
5. Propón la **ficha del catálogo**: si una ficha de `lib/data.ts` encaja con el juego (ver tabla de `porting.md`), propón reutilizarla; si no, propón una ficha nueva (`id`, `title`, `cat`, `color`, portada `cover-<id>`).
6. Si `$ARGUMENTS` viene vacío, pide en una frase qué juego se quiere (carpeta de referencia o idea nueva).

## Fase 2 — Preguntas

Pregunta en bloques de 3–5 con `AskUserQuestion`, con la recomendación primero y marcada como "(Recomendado)". No preguntes lo que ya está decidido por el contrato (`contract.md`) salvo que el juego lo rompa. Categorías que siempre debes cubrir:

- **Ficha:** reutilizar `<id>` existente o crear ficha nueva. Si se reutiliza, ¿se ajusta `long`/`short` para que describan lo que de verdad hace el juego?
- **Controles:** teclas exactas, tecla de inicio (ESPACIO por defecto), leyenda del overlay de inicio. Ratón o táctil quedan fuera salvo decisión explícita.
- **HUD:** Puntuación siempre. ¿Vidas, Nivel, otra stat (p. ej. Líneas)? ¿Qué se quita del canvas (HUD, GAME OVER, pausa propia, menús)? ¿Qué estado efímero se queda en el canvas (como el `3x` de ROCAS, o la pieza siguiente)?
- **Mundo y aspecto:** resolución lógica fija y cómo encaja en el CRT 4:3 (mundo 4:3 nativo, letterbox centrado, o rediseño del layout).
- **Mecánicas:** qué se conserva, qué se descarta, reglas de puntuación, de nivel y de fin de partida. Los reinicios por teclado del original se eliminan (los gestiona el modal).
- **Assets y sonido:** sprites y sonidos del original → `public/games/<id>/`, o recolor vectorial sin assets. ¿Sonido dentro o fuera de scope?
- **Estética:** recolor neón con la paleta del sitio (`--cyan`, `--magenta`, `--yellow`, `--green`) y qué elemento usa cada color. Para portada nueva, aplica `/frontend-design` a la hora de describirla.
- **Leaderboard:** confirma que la partida guarda en `scores` y que el juego pasa a `playable = true`. ¿Se cambia `DEFAULT_HALL_GAME`? (por defecto, no).

Si el usuario pide dos juegos o features grandes extra (multijugador, controles táctiles, editor de niveles), propón separarlas en otra spec.

Para de preguntar cuando puedas responder sin suponer nada: qué ficheros aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica que está terminado.

## Fase 3 — Escribir la spec

0. **Antes de escribir nada**, lee completos `../spec/SKILL.md` y `../spec/template.md` (aunque ya los conozcas de otra sesión: pueden haber cambiado). Aplica sus reglas de la "Phase 3 — Write the spec" y las "Global rules about the whole document": un objetivo de una sola frase, Scope con **In** y **Out** explícitos, pasos del plan que dejan el sistema funcional y commiteables por separado, criterios booleanos verificables, sección de Decisiones con lo descartado, sin TODOs y sin código largo.
1. Usa `spec-skeleton.md` como base de contenido y `../spec/template.md` como forma de cada sección.
2. Sustituye todos los marcadores `<id>`, `<Título>`, `<motor>`, etc. por valores reales. No dejes TODOs.
3. Si **no** existe `lib/games/registry.ts`, incluye el **paso 0 de bootstrap** de `contract.md` en Scope, Modelo de datos, Plan y Criterios (con "ROCAS funciona exactamente igual que antes"). Si ya existe, la spec solo registra el juego nuevo.
4. Incluye la parte de Supabase de `leaderboard.md` (migración `update`/`insert` de `games`).
5. Adapta los criterios estándar al juego y añade criterios específicos de sus mecánicas (puntos exactos por acción, condición de subida de nivel, condición de fin de partida).
6. Rellena **Decisiones** con lo decidido en la Fase 2, incluidas las cosas descartadas.
7. Si tienes toda la información, escribe la spec completa de una vez y pasa a la Fase 4, sin pedir confirmación sección a sección.

## Fase 4 — Guardar

Sigue la "Phase 4 — Save the spec" de `../spec/SKILL.md`, con estas concreciones:

1. Número: el mayor de `specs/` + 1, con dos dígitos.
2. Slug kebab-case con el juego y la ficha (p. ej. `07-tetris-caida`, `08-arkanoid-bloque-buster`).
3. Cabecera:
   - `**Status:** Borrador`
   - `**Depends on:** SPEC 05, SPEC 06` (más la spec que hizo el bootstrap, si ya existe). Comprueba que cada spec citada existe.
   - `**Date:**` la fecha del contexto de sesión.
4. Escribe `specs/NN-slug.md` sin pedir permiso. Si el fichero ya existe, pregunta antes.
5. Si no existe `specs/.spec-config.yml`, créalo con el contenido por defecto que indica `../spec/SKILL.md`; si existe, no lo toques.
6. Confirma al usuario: ruta, que está en `Borrador` y que debe pasarla a `Aprobado` tras revisarla, y el siguiente paso: `/spec-impl NN-slug`. **Para ahí.**

## Reglas duras

- Nunca escribas el fichero de la spec sin haber leído antes `../spec/SKILL.md` y `../spec/template.md` en esta sesión.
- Nunca escribas código ni modifiques ficheros que no sean la spec (y `specs/.spec-config.yml` si falta).
- Nunca modifiques `references/started-games/` (solo lectura) ni propongas cargar el `game.js` original con `<script>` o iframe (ver Decisiones de SPEC 05).
- Un juego por spec.
- Nunca leas `.env`; las credenciales de Supabase no hacen falta para escribir la spec.
- No inventes datos del original: si citas constantes, puntos o teclas, cópialos del código de referencia.
- No repitas preguntas ya respondidas.

## Argumentos

`$ARGUMENTS` es el nombre de una carpeta de referencia (`03-tetris`, `tetris`, `arkanoid`) o una descripción libre de un juego nuevo. Sin argumentos, pregunta primero.
