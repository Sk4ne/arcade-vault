## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm start       # next start
npm run lint    # eslint (flat config, eslint.config.mjs)
```

## Supabase

La app usa un proyecto remoto de Supabase (sin stack local con Docker). Clientes en `lib/supabase/`:

- `@/lib/supabase/server` → `createClient()` async para Server Components, Server Actions y Route Handlers.
- `@/lib/supabase/client` → `createClient()` para componentes con `"use client"`.

Ambos están tipados con `Database` (`lib/supabase/database.types.ts`, generado; no se edita a mano).

### 1. Variables de entorno

Copia `.env.example` a `.env` y rellena:

| Variable                               | Uso                                                               |
| -------------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto (`https://<project-ref>.supabase.co`).           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`). Pública por diseño.         |
| `SUPABASE_DB_PASSWORD`                 | Contraseña de la base de datos. Solo la usa la CLI, nunca la app. |

Ambas `NEXT_PUBLIC_*` están en el dashboard: Project Settings → API.

### 2. Enlazar la CLI

La CLI de Supabase está como devDependency (`supabase`); no hace falta instalarla global. Ejecuta en una terminal interactiva:

```bash
npx supabase login                          # una vez por máquina
npx supabase link --project-ref <project-ref>
npx supabase migration list --linked        # verifica el enlace
```

`supabase/config.toml` y `supabase/migrations/` están versionados; `supabase/.temp/` y `supabase/.branches/` son locales.

### 3. Scripts

```bash
npm run db:types           # regenera lib/supabase/database.types.ts desde el proyecto enlazado
npm run db:new <nombre>    # crea supabase/migrations/<timestamp>_<nombre>.sql
npm run db:push            # aplica las migraciones pendientes al proyecto remoto
```

Ejecuta `npm run db:types` después de cada cambio de esquema.

### 4. Verificar la conexión

```bash
curl -i localhost:3000/api/health
```

| Respuesta                                | Significado                                                       |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `200 {"ok":true}`                        | La app alcanza el proyecto de Supabase.                           |
| `503 {"ok":false,"error":"missing_env"}` | Falta `NEXT_PUBLIC_SUPABASE_URL` o la publishable key.            |
| `503 {"ok":false,"error":"unreachable"}` | El proyecto no responde (URL incorrecta, red o proyecto pausado). |
