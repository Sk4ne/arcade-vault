# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-07
> **Objective:** Portar a Next.js la página "Acerca de" del prototipo `references/templates/home-about/home-about/about.jsx` como ruta `/about`, con un formulario de contacto que envía el mensaje al equipo por correo mediante Resend desde una Server Action.

## Por qué existe esta spec

La SPEC 02 dejó "Acerca de" y el formulario de contacto fuera de alcance y reservó este trabajo para la SPEC 03. En el prototipo el envío está simulado (`setSent(name)` sin enviar nada). Esta spec porta la pantalla fiel al prototipo y sustituye la simulación por un envío real, manteniendo la API key de Resend solo en el servidor.

## Scope

**In:**

- Nueva ruta `app/about/page.tsx` con `metadata` propia: sección "ACERCA DE" (kicker, título, misión, 3 highlights con icono de píxeles), divisor animado de 24 píxeles y sección "CONTACTO" (intro con 3 tips + formulario). Textos en español, literales del prototipo.
- Navbar y panel móvil: añadir "Acerca de" (`/about`) después de "Salón de la Fama". Activo cuando `pathname.startsWith("/about")`.
- Formulario de contacto como componente de cliente `components/contact-form.tsx`: campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶  ENVIAR MENSAJE", animación `shake` si hay error de validación, y panel de éxito estilo terminal "VAULT-OS // TERMINAL" con "ENVIAR OTRO MENSAJE".
- Server Action `sendContactMessage` en `app/about/actions.ts` (`"use server"`) que valida los datos y envía un único correo al equipo con el SDK `resend`.
- Protección anti-abuso: validación en servidor y campo honeypot oculto.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`.
- Estado de error visible en el formulario cuando el envío falla (el prototipo no lo contemplaba).
- CSS del bloque `/* ===== ABOUT PAGE ===== */` (`styles.css` líneas 1071–1150 aprox., incluidos `.terminal-success`, `.term-*`, `.contact-*`, `.highlight*`, `.about-divider`) copiado a `app/globals.css`, sin duplicar reglas existentes (`.field`, `.fade-in`, `@keyframes shake`, `blink`).
- Reutilizar `components/reveal.tsx` de la SPEC 02 para la animación de aparición.

**Out of scope (para futuras specs):**

- Correo de confirmación automática al usuario (requiere dominio verificado en Resend).
- Rate limiting, captcha (Turnstile, reCAPTCHA) o cualquier servicio externo anti-spam.
- Guardar los mensajes en base de datos o en `localStorage`.
- Panel de administración o bandeja de mensajes.
- Plantillas de correo con React Email o HTML elaborado; el correo es texto plano.
- Enlace a "Acerca de" desde el footer u otras pantallas.
- Rediseño: se respeta el diseño del prototipo.
- Tests automatizados (el proyecto no tiene test runner).

## Modelo de datos

No se persiste nada. Se añaden tipos para el formulario y la respuesta de la acción.

```ts
// app/about/actions.ts
export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      message: string;                       // error general (p. ej. fallo de Resend)
      fields?: Partial<Record<"name" | "email" | "message", string>>;
    };

// Datos leídos del FormData
// name: string      (trim, 1–80 caracteres)
// email: string     (trim, formato de correo válido, máx. 120)
// message: string   (trim, 1–2000 caracteres)
// website: string   (honeypot; debe llegar vacío)
```

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

```env
RESEND_API_KEY=re_xxx
CONTACT_TO_EMAIL=equipo@ejemplo.com
CONTACT_FROM_EMAIL=Arcade Vault <onboarding@resend.dev>
```

Convenciones del correo enviado:

- `to`: `CONTACT_TO_EMAIL`. `from`: `CONTACT_FROM_EMAIL`. `replyTo`: el correo del usuario.
- `subject`: `[Arcade Vault] Nuevo mensaje de {name}`.
- Cuerpo en texto plano (`text`) con nombre, correo y mensaje; sin HTML interpolado.
- El panel de éxito muestra `name.toUpperCase()` del nombre ya recortado.

## Plan de implementación

Cada paso deja la app compilando. Antes de escribir código Next.js (Server Actions, `useActionState`, `cacheComponents`, `metadata`), leer la guía relevante en `node_modules/next/dist/docs/`. Para toda la UI, usar `/frontend-design` (la estética es la del prototipo; no se propone una nueva).

1. Dependencia y entorno: instalar `resend` (`npm i resend`), crear `.env.example` con las tres variables y confirmar que `.env*` sigue ignorado en `.gitignore` (excepto `.env.example`, que debe poder commitearse). Verificar: `npm run build` compila.
2. CSS: copiar a `app/globals.css` el bloque `ABOUT PAGE` del prototipo, omitiendo reglas y `@keyframes` ya presentes. Verificar: `npm run build` compila.
3. Navbar: en `components/nav.tsx` añadir `isAbout = pathname.startsWith("/about")` y el enlace "Acerca de" a `/about` en la barra y en el panel móvil. Verificar: el enlace aparece y navega (aún 404 hasta el paso 5).
4. Componentes de presentación en `components/about/`: `highlight-icon.tsx` (iconos `HEART`, `BROWSER`, `PLANT` en SVG de píxeles, `aria-hidden`). Componente de servidor.
5. Página: crear `app/about/page.tsx` con hero "ACERCA DE", highlights, divisor (envuelto en `Reveal`) y sección de contacto (envuelta en `Reveal`) que por ahora renderiza el formulario sin acción real. Definir `metadata`. Verificar: `/about` se ve igual al prototipo en 1280 px y 390 px.
6. Server Action: crear `app/about/actions.ts` con `sendContactMessage(prevState, formData)`: leer y recortar campos, rechazar si el honeypot `website` viene con valor (devolver éxito simulado sin enviar), validar longitudes y formato de correo, comprobar que las tres variables de entorno existen, enviar con `resend.emails.send` y devolver `ContactState`. No registrar en logs el contenido del mensaje. Verificar: `npx tsc --noEmit`.
7. Formulario: crear `components/contact-form.tsx` (cliente) con `useActionState(sendContactMessage, { status: "idle" })`; campos controlados por `name`, honeypot oculto visualmente (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`), botón deshabilitado con texto "ENVIANDO…" mientras `pending`, `shake` ante `status: "error"` y panel terminal en `status: "success"`. "ENVIAR OTRO MENSAJE" reinicia el estado y vacía los campos. Verificar: con claves reales, el correo llega a `CONTACT_TO_EMAIL`.
8. Limpiar: eliminar código sin uso y confirmar que ninguna clave o variable de entorno aparece en el bundle del cliente. Verificar: `npm run lint`.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y prerenderiza `/about`.
- [ ] `npx tsc --noEmit` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores en `app/`, `components/` y `lib/`.
- [ ] `/about` muestra, en este orden: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión, 3 highlights, divisor de 24 píxeles, "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips y el formulario.
- [ ] Los textos de `/about` coinciden literalmente con los de `about.jsx`.
- [ ] El navbar (escritorio y panel móvil) muestra "Acerca de" tras "Salón de la Fama"; es el enlace activo solo en `/about`.
- [ ] Enviar el formulario con algún campo vacío no llama a Resend y activa la animación `shake`.
- [ ] Enviar con un correo de formato inválido no llama a Resend y muestra el error bajo el campo correspondiente.
- [ ] Un mensaje de más de 2000 caracteres es rechazado por la Server Action.
- [ ] Con datos válidos y claves correctas, llega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Nuevo mensaje de {name}`, `reply-to` igual al correo del usuario y nombre, correo y mensaje en el cuerpo.
- [ ] Tras un envío correcto se muestra el panel terminal con `GRACIAS, {NOMBRE EN MAYÚSCULAS}.` y el botón "ENVIAR OTRO MENSAJE".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [ ] Mientras se envía, el botón está deshabilitado y muestra "ENVIANDO…"; no se pueden enviar dos correos con doble clic.
- [ ] Si Resend falla (p. ej. `RESEND_API_KEY` inválida), el formulario conserva lo escrito y muestra un mensaje de error; no aparece el panel de éxito.
- [ ] Si falta alguna variable de entorno, la acción devuelve `status: "error"` sin lanzar excepción no controlada.
- [ ] Un envío con el honeypot `website` relleno no genera ningún correo.
- [ ] `RESEND_API_KEY` no aparece en el HTML, el JS del cliente ni la pestaña Network del navegador.
- [ ] Las secciones bajo el pliegue aparecen al hacer scroll (clase `.in`); con `prefers-reduced-motion: reduce` son visibles sin animación.
- [ ] A ≤ 900 px el grid de contacto pasa a una columna y a ≤ 840 px `/about` no produce scroll horizontal.
- [ ] No hay errores de hidratación en la consola del navegador en `/about`.

## Decisiones

- **Sí:** ruta `/about`. El usuario pidió "About Page" y el prototipo usa `name: "about"`.
- **No:** `/acerca-de`. Se mezclaría con las rutas en inglés (`/games`, `/about`) sin ganar nada; los textos visibles sí van en español.
- **Sí:** Server Action con `useActionState`. La API key no sale del servidor, hay menos código que con un endpoint y funciona con el formulario en App Router.
- **No:** Route Handler `POST /api/contact`. Solo se justifica si otro cliente consumiera el endpoint; hoy no existe.
- **Sí:** destinatario y remitente por variables de entorno (`CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`). Permite usar `onboarding@resend.dev` en desarrollo y cambiar a un dominio verificado sin tocar código.
- **No:** correo de confirmación al usuario. Con `onboarding@resend.dev` Resend solo entrega al correo de la cuenta; requiere dominio verificado y queda para otra spec.
- **Sí:** validación en servidor más honeypot. Cubre el abuso básico sin dependencias; la validación del cliente por sí sola es evitable.
- **No:** rate limit ni captcha. Requieren servicio externo y estado compartido; merecen su propia spec si aparece abuso real.
- **Sí:** correo en texto plano. Evita inyección de HTML con contenido del usuario y mantiene el alcance pequeño.
- **Sí:** honeypot rellenado devuelve éxito simulado. No da pistas a los bots de que fueron detectados.
- **Sí:** añadir estado de error al formulario aunque el prototipo no lo tenga. El envío real puede fallar y el usuario no debe ver "MENSAJE RECIBIDO" sin que lo sea.
- **Sí:** reutilizar `components/reveal.tsx` y el CSS del prototipo en `app/globals.css`. Mismo criterio que la SPEC 02; no se migra a Tailwind.
- **Sí:** mantener el panel terminal con las líneas `[OK] Conectando…` como texto estático. Es parte del diseño; no representan pasos reales de red.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `onboarding@resend.dev` solo entrega al correo dueño de la cuenta Resend | `CONTACT_TO_EMAIL` debe ser ese correo en desarrollo; documentarlo en `.env.example`. Para producción, verificar un dominio. |
| La API key se filtra al cliente o al repositorio | Variable sin prefijo `NEXT_PUBLIC_`, usada solo en `actions.ts`; `.env*` ignorado y solo `.env.example` versionado. |
| Un bot satura la cuota de Resend | Honeypot y validación mitigan lo básico; si hay abuso real, abrir una spec de rate limit/captcha. |
| Inyección de cabeceras o HTML vía nombre/correo | Cuerpo en `text`; `subject` construido con el nombre recortado sin saltos de línea (eliminar `\r` y `\n`). |
| `cacheComponents` rompe el prerender de `/about` por acceso a datos dinámicos | La página es estática; el acceso a `process.env` y a Resend ocurre solo dentro de la Server Action. |
| Fallo de red o de Resend deja al usuario sin respuesta | `try/catch` en la acción; devuelve `status: "error"` y el formulario conserva lo escrito. |
| `.reveal` deja secciones con `opacity: 0` si falla el JS | Mismo componente `Reveal` de la SPEC 02, que ya cubre `prefers-reduced-motion`. |

## Qué **no** está en esta spec

- Correo de confirmación al usuario.
- Rate limiting, captcha o servicios anti-spam externos.
- Almacenamiento de mensajes (base de datos, `localStorage`).
- Panel de administración de mensajes.
- Plantillas de correo en HTML o React Email.
- Rediseño de la interfaz.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propia spec.
