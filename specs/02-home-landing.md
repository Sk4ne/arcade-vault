# SPEC 02 — Home (landing) de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-07
> **Objective:** Portar a Next.js la Home del prototipo `references/templates/home-about/home-about/home.jsx` como ruta `/`, moviendo la Biblioteca actual a `/games`.

## Por qué existe esta spec

La SPEC 01 dejó la Biblioteca en `/` con un hero mínimo. El nuevo prototipo (`home-about/`) separa una landing de presentación (hero, ventajas, vista previa de juegos, actividad, precios) de la Biblioteca. Esta spec reubica la Biblioteca y monta la landing, sin tocar el resto de pantallas salvo los enlaces que apuntaban a `/`.

## Scope

**In:**

- Nueva `app/page.tsx` con la Home: hero con siluetas flotantes y CTAs, "¿Por qué Arcade Vault?" (4 tarjetas), "Juegos disponibles ahora" (6 mini-tarjetas), bloque de estadísticas, "Actividad en vivo" (últimas puntuaciones + top jugadores), "Precios" (plan único + FAQ) y CTA final.
- Mover la Biblioteca actual (hero `av-hero` + `<Library />`) a `app/games/page.tsx`, con su `metadata` actual.
- Navbar y panel móvil: añadir "Inicio" (`/`); "Biblioteca" pasa a `/games`. Estado activo: "Inicio" solo en `/`; "Biblioteca" en `/games` y `/juego/*`; "Salón de la Fama" en `/salon`.
- Actualizar los enlaces que apuntan a la Biblioteca con `href="/"`: `app/juego/[id]/page.tsx`, `components/hall-of-fame.tsx` y `components/game-player.tsx`.
- Datos mock tipados de la Home en `lib/data.ts`.
- Animación de aparición al hacer scroll (clase `.reveal` / `.in`) mediante un componente de cliente con `IntersectionObserver`.
- CSS de la Home y de actividad/precios copiado del prototipo a `app/globals.css`.
- `metadata` propia de `/`. Textos en español, fieles al prototipo.

**Out of scope (para futuras specs):**

- Página "Acerca de" y formulario de contacto (`about.jsx`). Va en su propia spec; el navbar no añade "Acerca de" todavía.
- Backend, API o datos reales para "Últimas puntuaciones", "Top jugadores" o las estadísticas.
- Hacer que las secciones de actividad reflejen `av_scores` de `localStorage`.
- Integración real de registro o pago (el plan "$0" es solo contenido).
- El gamepad virtual y sus temas (`styles.css` líneas 1151–1620); no pertenecen a la Home.
- Rediseño: se respeta el diseño del prototipo.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

Se añade a `lib/data.ts`, junto a `GAMES`. Contenido literal del prototipo.

```ts
// lib/data.ts
export type NeonColor = "cyan" | "magenta" | "green" | "yellow";

export type HomeFeature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: NeonColor;
};

export type RecentScore = {
  player: string;
  game: string;     // título tal como aparece en el prototipo ("Caída", "Glotón"…)
  score: number;
  ago: string;      // texto fijo, p. ej. "hace 2 min"; no se calcula con Date
  color: NeonColor;
};

export type TopPlayer = { rank: number; player: string; score: number };
export type HomeStat = { n: string; unit: string; sub: string };
export type FaqItem = { q: string; a: string };

// Constantes exportadas
// HOME_FEATURES: HomeFeature[]   (4)
// RECENT_SCORES: RecentScore[]   (7)
// TOP_PLAYERS: TopPlayer[]       (5)
// HOME_STATS: HomeStat[]         (3)
// PRICING_PERKS: string[]        (6)
// FAQ: FaqItem[]                 (3)
```

Las mini-tarjetas usan `GAMES.slice(0, 6)` ya existente. No se tocan `Game`, `ScoreRow` ni `seededScores`.

Convenciones:

- Números con `fmt()` (`toLocaleString("es-ES")`).
- Rango en el top: `#01`, `#02`… (`String(rank).padStart(2, "0")`).
- Prohibido `Math.random`, `Date.now` y `new Date()` en el render (`cacheComponents` activo).

## Plan de implementación

Cada paso deja la app compilando. Antes de escribir código Next.js, leer la guía relevante en `node_modules/next/dist/docs/`. Para toda la UI, usar `/frontend-design` (la estética es la del prototipo; no se propone una nueva).

1. Mover la Biblioteca: crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero + `<Library />` + metadata). Mantener `app/page.tsx` sin cambios hasta el paso 8 (la Biblioteca queda temporalmente en ambas rutas). Verificar: `/games` muestra las 8 tarjetas.
2. Navbar: en `components/nav.tsx` añadir "Inicio" y apuntar "Biblioteca" a `/games` (barra y panel móvil); `isHome = pathname === "/"`, `isLibrary = pathname.startsWith("/games") || pathname.startsWith("/juego")`. Verificar: el enlace activo cambia según la ruta.
3. Enlaces: cambiar a `/games` los `href="/"` de Biblioteca en `app/juego/[id]/page.tsx`, `components/hall-of-fame.tsx` y `components/game-player.tsx`. Mantener `router.push("/")` en `components/auth-form.tsx` (lleva a la Home). Verificar: "Volver" desde detalle, reproductor y salón llega a `/games`.
4. Datos: añadir tipos y constantes de la Home a `lib/data.ts`. Verificar: `npx tsc --noEmit`.
5. CSS: copiar a `app/globals.css` los bloques `/* ===== HOME PAGE ===== */` (`styles.css` 930–1070) y `/* ===== ACTIVITY ===== */` + `/* ===== PRICING ===== */` (1621–1730), junto con los `@keyframes` que usen (`float`, `bounce`, `tickin`, `pulse-led`, `pxblink`). No duplicar reglas ya presentes. Verificar: `npm run build` compila.
6. Componentes de presentación en `components/home/`: `silhouettes.tsx` (8 SVG decorativos, `aria-hidden`), `feature-icon.tsx` (4 iconos de píxeles) y `mini-card.tsx` (envuelta en `next/link` a `/juego/[id]`, sin `onClick`). Son componentes de servidor.
7. `components/reveal.tsx` (cliente): envuelve una sección, añade `.in` al entrar en el viewport (umbral 0.12, `unobserve` tras activarse) y desconecta el observer al desmontar. Con `prefers-reduced-motion: reduce` el contenido se muestra sin animación.
8. Reemplazar `app/page.tsx` por la Home componiendo las secciones, con `Link` para todos los CTA (ver tabla en Criterios). Definir `metadata` de `/`. Verificar: `npm run dev`, recorrer la página completa en 1280 px y 390 px.
9. Limpiar: eliminar código sin uso y confirmar que no quedan `href="/"` de Biblioteca. Verificar: `npm run lint`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y prerenderiza `/` y `/games`.
- [ ] `npx tsc --noEmit` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `/games` muestra el hero y las 8 tarjetas con búsqueda y chips, igual que la antigua `/`.
- [ ] `/` muestra, en este orden: hero, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA", estadísticas, "ACTIVIDAD EN VIVO", "PRECIOS" y "¿LISTO PARA JUGAR?".
- [ ] El hero muestra las tres líneas del título, el subtítulo, 8 siluetas y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
- [ ] Hay 4 tarjetas de ventajas, 6 mini-tarjetas, 3 bloques de estadísticas, 7 filas de últimas puntuaciones, 5 filas de top jugadores y 3 preguntas de FAQ.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] Pulsar una mini-tarjeta navega a `/juego/[id]` del juego correspondiente.
- [ ] En el navbar (escritorio y panel móvil) aparecen "Inicio", "Biblioteca" y "Salón de la Fama"; "Inicio" es el activo solo en `/`; "Biblioteca" es el activo en `/games` y `/juego/*`.
- [ ] El logo del navbar lleva a `/`.
- [ ] Los botones de volver a la Biblioteca en `/juego/[id]`, en el reproductor y en `/salon` llevan a `/games`.
- [ ] Entrar en `/auth` sigue redirigiendo a `/`.
- [ ] Las secciones bajo el pliegue aparecen al hacer scroll (clase `.in`); con `prefers-reduced-motion: reduce` son visibles sin animación.
- [ ] Las puntuaciones y fechas de la Home son idénticas en cada visita y recarga.
- [ ] A ≤ 840 px la Home no produce scroll horizontal y los CTA quedan apilados y legibles.
- [ ] No hay errores de hidratación en la consola del navegador en `/` ni en `/games`.

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/games`. Es la estructura del prototipo (Inicio y Biblioteca como destinos distintos).
- **No:** embeber la Biblioteca en la Home. El prototipo solo muestra 6 mini-tarjetas con enlace a la Biblioteca.
- **No:** Home en `/inicio` dejando la Biblioteca en `/`. La landing debe ser la raíz del sitio.
- **Sí:** portar las seis secciones completas, incluidos precios y FAQ. El prototipo es la fuente de verdad; recortar contenido se decide en otra spec.
- **Sí:** datos de actividad, top y estadísticas como mock tipado en `lib/data.ts`. Mismo patrón que `GAMES`; facilita sustituirlos por backend.
- **No:** hardcodear esos datos en los componentes. Mezcla contenido con marcado.
- **Sí:** tiempos relativos ("hace 2 min") como texto fijo. Evita `Date.now` con `cacheComponents` y diferencias servidor/cliente.
- **Sí:** secciones y mini-tarjetas como componentes de servidor; solo `Reveal` es de cliente. Mantiene la Home prerenderizada.
- **No:** replicar el `onClick` + `navigate` del prototipo. Se usan `Link` para tener enlaces reales y prefetch.
- **Sí:** `router.push("/")` tras iniciar sesión se mantiene. La SPEC 01 ya lo fija y ahora lleva a la Home.
- **Sí:** reutilizar el CSS del prototipo en `app/globals.css`. No se migra a clases de Tailwind.
- **No:** incluir "Acerca de" ni contacto. Una pantalla por spec; entra en la SPEC 03.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `.reveal` deja las secciones con `opacity: 0` si falla el JS o el observer | `Reveal` desconecta y activa `.in` también bajo `prefers-reduced-motion`; verificar con JS desactivado y documentar el resultado. |
| Cambiar `/` rompe enlaces y estado activo existentes | Paso 3 revisa los tres `href="/"` conocidos y un `grep` final sobre `app/` y `components/`. |
| Los criterios de la SPEC 01 que mencionan `/` como Biblioteca quedan desfasados | La SPEC 01 queda como histórico; esta spec es la vigente para `/` y `/games`. |
| `cacheComponents` falla el prerender por datos dinámicos | Datos 100 % estáticos; `IntersectionObserver` solo corre en un efecto de cliente. |
| Los títulos de juego del mock ("Bloque Buster") no coinciden con los de `GAMES` | Se mantiene el texto del prototipo; la actividad es decorativa y no enlaza a juegos. |
| Copiar CSS duplica o pisa reglas de `globals.css` (`fadeIn`, `pulse`, `blink`) | Copiar solo los bloques Home/Actividad/Precios y omitir `@keyframes` ya definidos. |

## Qué **no** está en esta spec

- Página "Acerca de" y formulario de contacto.
- Backend, API o datos reales de actividad, ranking y estadísticas.
- Puntuaciones guardadas localmente reflejadas en la Home.
- Registro o pago reales.
- Gamepad virtual.
- Tests automatizados.
- Rediseño de la interfaz.

Cada uno de ellos, si se aborda, va en su propia spec.
