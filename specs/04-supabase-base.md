# SPEC 04 — Base de Supabase en la app de Next.js

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-11
> **Objective:** Conectar la app de Next.js al proyecto remoto de Supabase con clientes tipados de servidor y navegador, CLI versionada y un endpoint `/api/health` que verifica la conexión.

## Por qué existe esta spec

Hoy la sesión (`av_user`) y las puntuaciones (`av_scores`) viven en `localStorage` dentro de `components/user-provider.tsx`, y el login de `components/auth-form.tsx` es simulado. Llevar auth y puntuaciones a Supabase toca demasiadas áreas para una sola spec. Esta spec solo deja la infraestructura lista y verificable, para que las specs de Auth y de puntuaciones se limiten a usarla. El proyecto remoto está vacío: sin tablas en `public` ni migraciones.

## Scope

**In:**

- Dependencias de runtime `@supabase/supabase-js` y `@supabase/ssr`.
- CLI de Supabase como devDependency `supabase`, con scripts npm para tipos y migraciones.
- Carpeta `supabase/` versionada (`supabase init`) y enlazada al proyecto remoto (`supabase link`).
- Cliente de servidor `lib/supabase/server.ts` (`createServerClient` + `cookies()` de `next/headers`).
- Cliente de navegador `lib/supabase/client.ts` (`createBrowserClient`).
- Tipos generados en `lib/supabase/database.types.ts`, pasados como genérico `Database` a ambos clientes.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example` y `.env.template`.
- Route Handler `app/api/health/route.ts` que comprueba la conexión con el proyecto remoto.
- Sección "Supabase" en `README.md` con los pasos de configuración y los scripts nuevos.

**Out of scope (para futuras specs):**

- `proxy.ts` (antes `middleware.ts`) para refrescar la sesión. Entra con la spec de Auth.
- Registro e inicio de sesión reales con Supabase Auth; `auth-form.tsx` y `user-provider.tsx` no cambian.
- Tablas, RLS y migraciones de esquema (puntuaciones, perfiles, catálogo de juegos).
- Salón de la Fama y actividad de la Home con datos reales.
- Migrar `av_user` / `av_scores` de `localStorage` a Supabase.
- `SUPABASE_SECRET_KEY` y cliente admin (service role).
- Stack local con Docker (`supabase start`).
- Edge Functions, Storage y Realtime.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

No se crean tablas. La base remota sigue vacía. Se introducen los tipos generados y las variables de entorno.

```ts
// lib/supabase/database.types.ts — generado, no se edita a mano
export type Database = {
  public: {
    Tables: {};
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  }; /* … */
};

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// app/api/health/route.ts — cuerpo de la respuesta
type HealthResponse =
  { ok: true } | { ok: false; error: "missing_env" | "unreachable" };
```

Variables de entorno (públicas por diseño; la publishable key está pensada para el navegador):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_DB_PASSWORD=xxxx   # ya existe; solo la usa la CLI (supabase link / db push)
```

Scripts npm nuevos en `package.json`:

```json
"db:types": "supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts",
"db:push": "supabase db push",
"db:new": "supabase migration new"
```

Convenciones:

- Ambos ficheros exportan una función llamada `createClient`; se importan desde `@/lib/supabase/server` o `@/lib/supabase/client`.
- `lib/supabase/server.ts` solo se importa desde Server Components, Server Actions y Route Handlers.
- `lib/supabase/client.ts` solo se importa desde componentes con `"use client"`.
- Ningún cliente se crea a nivel de módulo: siempre dentro de la función que lo usa.

## Plan de implementación

Cada paso deja la app compilando. Antes de escribir código Next.js (Route Handlers, `cookies()`, `cacheComponents`), leer la guía relevante en `node_modules/next/dist/docs/`. Consultar la guía de `@supabase/ssr` para Next.js App Router (MCP `search_docs`) antes de los pasos 4 y 5.

1. Dependencias: `npm i @supabase/supabase-js @supabase/ssr` y `npm i -D supabase`. Verificar: `npm run build` compila y `npx supabase --version` responde.
2. Entorno: añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con comentarios a `.env.example` y `.env.template`. Conservar `SUPABASE_DB_PASSWORD` en `.env.template` y añadirla a `.env.example`. Rellenar `.env` local con los valores reales (MCP `get_project_url` y `get_publishable_keys`). Verificar: `git status` no muestra `.env`.
3. CLI: `npx supabase init` y `npx supabase link --project-ref <ref>`. Versionar `supabase/config.toml` y `supabase/migrations/` (vacía, con `.gitkeep`). Añadir a `.gitignore` lo que la CLI genera como local (`supabase/.temp/`, `supabase/.branches/`). Verificar: `npx supabase migration list --linked` responde sin error.
4. Tipos: añadir los scripts `db:types`, `db:push` y `db:new` y ejecutar `npm run db:types`. Verificar: existe `lib/supabase/database.types.ts` y `npx tsc --noEmit` pasa.
5. Clientes: crear `lib/supabase/server.ts` (async, `await cookies()`, `getAll`/`setAll`; `setAll` en `try/catch` porque falla en Server Components) y `lib/supabase/client.ts`. Ambos tipados con `Database` y fallan con un error claro si falta alguna variable. Verificar: `npx tsc --noEmit`.
6. Health: crear `app/api/health/route.ts` con `GET` dinámico. Si faltan variables, responde `503 { ok: false, error: "missing_env" }`. Si no, llama a `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` con la cabecera `apikey` y `cache: "no-store"`; responde `200 { ok: true }` si es 2xx y `503 { ok: false, error: "unreachable" }` en otro caso o ante excepción. Nunca devuelve URL, claves ni mensajes internos. Verificar: `curl -i localhost:3000/api/health`.
7. Documentación: sección "Supabase" en `README.md` (variables, `supabase link`, `npm run db:types`, `npm run db:new`, `npm run db:push`, `/api/health`). Verificar: `npm run lint`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y las rutas existentes (`/`, `/games`, `/about`, `/salon`, `/auth`, `/juego/[id]`) siguen prerenderizándose como antes.
- [ ] `npx tsc --noEmit` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`.
- [ ] `package.json` tiene los scripts `db:types`, `db:push` y `db:new`.
- [ ] `supabase/config.toml` y `supabase/migrations/` están versionados; `supabase/.temp/` no lo está.
- [ ] `npm run db:types` regenera `lib/supabase/database.types.ts` sin cambios respecto a la versión commiteada.
- [ ] `lib/supabase/server.ts` y `lib/supabase/client.ts` exportan `createClient` tipado con `Database`.
- [ ] `.env.example` y `.env.template` documentan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_DB_PASSWORD`; `.env` no está en git.
- [ ] Con `.env` correcto, `GET /api/health` responde `200` con `{"ok":true}`.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL` en el entorno, `GET /api/health` responde `503` con `{"ok":false,"error":"missing_env"}` y la app no se cae.
- [ ] Con una URL inalcanzable (p. ej. `https://invalido.supabase.co`), `GET /api/health` responde `503` con `{"ok":false,"error":"unreachable"}`.
- [ ] Dos peticiones seguidas a `/api/health` hacen dos llamadas a Supabase (no se cachea la respuesta).
- [ ] La respuesta de `/api/health` no contiene la URL del proyecto ni ninguna clave.
- [ ] `SUPABASE_DB_PASSWORD` no aparece en el HTML ni en el JS servido al navegador.
- [ ] Login simulado, guardado de puntuaciones en `localStorage` y formulario de contacto funcionan igual que antes.
- [ ] `README.md` incluye la sección "Supabase" con los pasos de configuración.

## Decisiones

- **Sí:** spec solo de infraestructura. Auth, puntuaciones y Salón real son specs separadas; mezclarlas superaría tres áreas del sistema.
- **Sí:** `@supabase/ssr` en vez de solo `supabase-js`. Es el paquete oficial para App Router y gestiona la sesión en cookies, necesario en la spec de Auth.
- **No:** `@supabase/auth-helpers-nextjs`. Está deprecado en favor de `@supabase/ssr`.
- **Sí:** Supabase CLI con carpeta `supabase/` versionada. Las migraciones quedan en git y se revisan en PRs.
- **No:** gestionar el esquema solo desde el dashboard o el MCP. No deja rastro reproducible.
- **Sí:** CLI como devDependency. Versión fijada y scripts npm iguales para todos.
- **No:** instalación global de la CLI. Cada desarrollador podría tener una versión distinta.
- **Sí:** proyecto remoto en desarrollo. Evita depender de Docker; el proyecto está vacío y no hay datos que proteger todavía.
- **No:** stack local (`supabase start`). Se reconsidera cuando haya migraciones que probar antes de aplicarlas.
- **Sí:** publishable key (`sb_publishable_…`). Es el formato actual de Supabase y se puede rotar sin invalidar JWT.
- **No:** anon key legacy. Formato antiguo.
- **No:** secret key ni cliente admin. Ningún caso de uso lo necesita aún; añadirlo antes amplía la superficie de riesgo.
- **No:** `proxy.ts` todavía. Sin sesiones solo añade una llamada por petición; entra con la spec de Auth.
- **Sí:** tipos generados en `lib/supabase/database.types.ts`. Los clientes nacen tipados y las specs siguientes solo regeneran.
- **Sí:** `/api/health` como verificación. Comprueba variables y red de forma repetible, también en producción.
- **No:** tabla de prueba para verificar la conexión. Crearía esquema que no pertenece al dominio.
- **No:** verificar solo con build y tipos. No demuestra que la app alcance el proyecto en runtime.
- **Sí:** health contra `/auth/v1/health`. Funciona con la base vacía y no depende de tablas ni de RLS.
- **Sí:** actualizar `.env.example` y `.env.template`. Ambos están versionados; se mantienen sincronizados hasta que se decida eliminar uno.

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cacheComponents` cachea o prerenderiza `/api/health` y oculta caídas             | `GET` dinámico y `fetch` con `cache: "no-store"`; criterio de dos peticiones = dos llamadas. |
| Importar `lib/supabase/server.ts` desde un componente de cliente rompe el build   | Convención documentada; considerar `import "server-only"` en `server.ts`.                    |
| `cookies()` hace dinámica una página que hoy es estática                          | Esta spec no usa el cliente de servidor en ninguna página; solo existe para specs futuras.   |
| `SUPABASE_DB_PASSWORD` o un `.env` se commitean                                   | `.env*` ya ignorado salvo `.env.example` y `.env.template`, que solo llevan placeholders.    |
| Los tipos generados quedan desfasados respecto al remoto                          | Script `db:types` documentado; cada spec que cambie el esquema lo ejecuta en su plan.        |
| La versión de la CLI en `node_modules` genera ficheros locales no deseados en git | Ignorar `supabase/.temp/` y `supabase/.branches/` en el paso 3.                              |
| Proyecto remoto pausado (plan gratuito)                                           | `/api/health` devuelve `503 unreachable`; reactivarlo desde el dashboard.                    |

## Qué **no** está en esta spec

- `proxy.ts` y refresco de sesión.
- Login y registro reales con Supabase Auth.
- Tablas, RLS y migraciones de esquema.
- Salón de la Fama y actividad con datos reales.
- Migración de `localStorage` a Supabase.
- Secret key y cliente admin.
- Stack local con Docker.
- Edge Functions, Storage y Realtime.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propia spec.
