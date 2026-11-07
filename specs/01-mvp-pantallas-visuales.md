# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Implementado
> **Depends on:** ninguna
> **Date:** 2026-11-03
> **Objective:** Portar a Next.js las cinco pantallas del prototipo `references/templates/` (biblioteca, detalle, reproductor, auth y salón de la fama) como rutas del App Router, solo la parte visual y sin implementar ningún juego.

## Por qué existe esta spec

`app/` todavía es el scaffold de Create Next App. El prototipo (`references/templates/*.jsx`) es una SPA con React por CDN y navegación por hash. Esta spec lo convierte en rutas reales y fija qué es mock y qué no, para que las specs de juegos y backend partan de una base estable.

## Scope

**In:**

- Cinco rutas del App Router: `/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon`.
- Navbar, menú móvil y footer compartidos desde `app/layout.tsx`.
- Datos mock tipados en `lib/data.ts` (8 juegos, categorías, `seededScores`).
- Sesión simulada en `localStorage` (clave `av_user`) mediante un provider de cliente.
- Reproductor simulado: puntuación que sube sola, pausa, fin, modal para guardar puntuación en `localStorage` (clave `av_scores`).
- Estado 404 para ids de juego inexistentes (`notFound()`).
- Textos en español, tal como en el prototipo.

**Out of scope (para futuras specs):**

- Cualquier juego jugable (lógica, canvas, controles).
- Backend, base de datos, API routes o route handlers.
- Autenticación real (validación, hashing, OAuth con Google/GitHub). Los botones sociales son decorativos.
- Que las puntuaciones guardadas aparezcan en las tablas del salón o del detalle.
- Tests automatizados (el proyecto no tiene test runner).
- Rediseño: se respeta el diseño del prototipo y su CSS.

## Modelo de datos

El CSS del prototipo ya está en `app/globals.css` y las fuentes en `app/layout.tsx`; no se rehacen.

```ts
// lib/data.ts
type GameColor = "cyan" | "magenta" | "green" | "yellow";

type Game = {
  id: string;        // slug de la URL, p. ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;     // clase CSS, p. ej. "cover-bricks"
  color: GameColor;  // color del botón JUGAR
  best: number;
  plays: string;
};

type ScoreRow = { rank: number; name: string; score: number; date: string };

// seededScores(seed: number, count?: number): ScoreRow[]  (determinista, sin Math.random)
// GAMES: Game[]  ·  CATS: ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
```

```ts
// Sesión simulada (components/user-provider.tsx)
type User = { name: string }; // localStorage "av_user"; null = invitado

// Puntuación guardada desde el reproductor (localStorage "av_scores", array)
type SavedScore = { game: string; score: number; name: string; at: number };
```

Convenciones:

- Números con `toLocaleString("es-ES")`.
- `av_user` se lee tras la hidratación (en `useEffect`) para no causar mismatch servidor/cliente.

## Plan de implementación

Cada paso deja la app compilando y ejecutable. Antes de escribir código Next.js, leer la guía relevante en `node_modules/next/dist/docs/` (`cacheComponents` y `partialPrefetching` están activos).

1. Crear `lib/data.ts` con los tipos, `GAMES`, `CATS`, `seededScores`, `fmt` y `getGame`. Verificar: `npx tsc --noEmit`.
2. Crear `components/user-provider.tsx` (contexto con `user`, `login`, `logout`, `saveScore`).
3. Crear `components/nav.tsx` (navbar, menú móvil, enlaces con `next/link`, estado activo con `usePathname`). Montar `UserProvider`, `Nav`, `<main className="av-main">` y el footer en `app/layout.tsx`. Verificar: `npm run dev` y ver el navbar en `/`.
4. Biblioteca: `components/game-card.tsx` (efecto tilt), `components/library.tsx` (búsqueda por nombre, chips de categoría, estado vacío) y reemplazar `app/page.tsx`. Verificar: filtrar y ver tarjetas.
5. Detalle: `app/juego/[id]/page.tsx` con `generateStaticParams`, `generateMetadata`, `notFound()` y tabla de mejores puntuaciones. Verificar: abrir `/juego/caida` y `/juego/no-existe`.
6. Reproductor: `components/game-player.tsx` y `app/juego/[id]/jugar/page.tsx` (HUD, marco CRT, pausa, modal de fin con guardado). Verificar: jugar, pausar, terminar y guardar.
7. Auth: `components/auth-form.tsx` y `app/auth/page.tsx` (pestañas entrar/crear cuenta, invitado, redirección a `/`). Verificar: el navbar muestra el nombre tras entrar y "Cerrar sesión" lo limpia.
8. Salón de la fama: `components/hall-of-fame.tsx` y `app/salon/page.tsx` (pestañas por juego, podio, tabla, fila "tu mejor marca" si hay sesión). Verificar: cambiar de juego y ver el podio.
9. Ajustar `metadata` de cada página y eliminar el código del scaffold que quede sin uso.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y prerenderiza `/`, `/auth`, `/salon` y los 8 ids en `/juego/[id]` y `/juego/[id]/jugar`.
- [ ] `npx tsc --noEmit` no reporta errores en el código de `app/`, `components/` y `lib/` (ejecutado tras `next build` o `next dev`, que generan los tipos `PageProps`).
- [ ] `npm run lint` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `/` muestra 8 tarjetas; buscar "caí" deja solo CAÍDA; el chip SHOOTER deja INVASORES y ROCAS; una búsqueda sin resultados muestra "NO HAY RESULTADOS".
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juego/[id]`.
- [ ] `/juego/[id]` muestra descripción, etiquetas, estadísticas y 10 filas de puntuaciones; las mismas en cada visita.
- [ ] `/juego/no-existe` devuelve la página 404 de Next.js.
- [ ] "JUGAR AHORA" lleva a `/juego/[id]/jugar`; allí la puntuación aumenta sola, PAUSA la detiene y REANUDAR la continúa.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN añade una entrada a `localStorage.av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] SALIR vuelve a `/juego/[id]`; "VOLVER AL VAULT" y "JUGAR DE NUEVO" funcionan.
- [ ] En `/auth`, entrar con cualquier usuario guarda `av_user`, redirige a `/` y el navbar muestra el nombre en mayúsculas (máx. 10 caracteres).
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin `av_user`.
- [ ] Recargar la página conserva la sesión.
- [ ] `/salon` muestra podio y tabla del primer juego; elegir otro juego cambia ambos; la fila "TU MEJOR MARCA" solo aparece con sesión.
- [ ] A ≤ 840 px el navbar muestra el botón hamburguesa y el panel móvil abre y cierra.
- [ ] El enlace activo del navbar es "Biblioteca" en `/`, `/juego/*`, y "Salón de la Fama" en `/salon`.
- [ ] No hay errores de hidratación en la consola del navegador en ninguna de las cinco rutas.

## Decisiones

- **Sí:** rutas reales del App Router. URLs compartibles y `generateStaticParams`; el hash del prototipo no encaja con Next.js.
- **No:** replicar la SPA con estado de ruta. Pierde prerender, enlaces y botón "atrás".
- **Sí:** sesión simulada en `localStorage` (`av_user`). Reproduce el prototipo y habilita el navbar y el salón sin backend.
- **No:** sesión por cookies o auth real. Pertenece a una spec de backend.
- **Sí:** mock tipado en `lib/data.ts`, con `seededScores` determinista. Evita diferencias servidor/cliente.
- **No:** route handlers mock. Superficie extra sin valor en un MVP visual.
- **Sí:** reproductor con simulación del prototipo. Permite validar HUD, pausa y modal de fin.
- **Sí:** reutilizar `app/globals.css` y las fuentes ya configuradas, sin migrar a clases de Tailwind. Evita rediseñar.
- **Sí:** el diseño es el del prototipo. `/frontend-design` ya está aplicado en él; no se propone una estética nueva.
- **No:** mostrar en el salón las puntuaciones guardadas localmente. Requiere modelo de ranking real; va en otra spec.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `cacheComponents` hace fallar el prerender con datos dinámicos (`Math.random`, `Date.now`) | El azar y `localStorage` solo se usan en efectos de cliente; `seededScores` es determinista. |
| Mismatch de hidratación por leer `localStorage` en el render | `UserProvider` lee `av_user` en `useEffect`; el estado inicial es `null`. |
| La API de Next.js 16.4 difiere de lo conocido (`params` es una Promise, `PageProps` global) | Leer `node_modules/next/dist/docs/` antes de cada paso y usar `await params`. |
| `localStorage` no disponible (modo privado) | Envolver lecturas/escrituras en `try/catch`; la app funciona sin persistir. |
| `npm run lint` falla por los `.jsx` de `references/templates/` | Medir el criterio solo sobre `app/`, `components/` y `lib/`; no tocar la referencia. |

## Qué **no** está en esta spec

- Ningún juego jugable.
- Backend, base de datos o API.
- Autenticación real u OAuth.
- Ranking real alimentado por las puntuaciones guardadas.
- Tests automatizados.
- Rediseño de la interfaz.

Cada uno de ellos, si se aborda, va en su propia spec.
