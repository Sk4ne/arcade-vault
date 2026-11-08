"use client";

import { useActionState, useState } from "react";
import { sendContactMessage, type ContactState } from "@/app/about/actions";

const INITIAL: ContactState = { status: "idle" };

const errorStyle = {
  color: "var(--magenta)",
  fontSize: 11,
  letterSpacing: "0.04em",
} as const;

const honeypotStyle = {
  position: "absolute",
  left: "-9999px",
  width: 1,
  height: 1,
  overflow: "hidden",
} as const;

/** Al cambiar `key` se remonta el formulario: estado de la acción y campos vuelven a vacío. */
export function ContactForm() {
  const [attempt, setAttempt] = useState(0);
  return <ContactFormInner key={attempt} onReset={() => setAttempt((n) => n + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, INITIAL);
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  // Último estado de error cuya animación ya terminó; evita un efecto para apagar `shake`.
  const [shaken, setShaken] = useState<ContactState | null>(null);

  const shake = state.status === "error" && shaken !== state;
  const fieldErrors = state.status === "error" ? state.fields : undefined;
  const set = (key: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onAnimationEnd={() => setShaken(state)}
      noValidate
    >
      {state.status !== "success" ? (
        <>
          <div className="field">
            <label htmlFor="c-name">NOMBRE</label>
            <input
              id="c-name"
              name="name"
              value={values.name}
              onChange={set("name")}
              placeholder="px_kai"
              maxLength={80}
              aria-invalid={!!fieldErrors?.name}
              aria-describedby={fieldErrors?.name ? "c-name-err" : undefined}
            />
            {fieldErrors?.name && (
              <span id="c-name-err" style={errorStyle}>
                {fieldErrors.name}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="c-email">CORREO ELECTRÓNICO</label>
            <input
              id="c-email"
              name="email"
              type="email"
              value={values.email}
              onChange={set("email")}
              placeholder="jugador@vault.gg"
              maxLength={120}
              aria-invalid={!!fieldErrors?.email}
              aria-describedby={fieldErrors?.email ? "c-email-err" : undefined}
            />
            {fieldErrors?.email && (
              <span id="c-email-err" style={errorStyle}>
                {fieldErrors.email}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="c-message">MENSAJE</label>
            <textarea
              id="c-message"
              name="message"
              rows={5}
              value={values.message}
              onChange={set("message")}
              placeholder="Cuéntanos qué tienes en mente…"
              aria-invalid={!!fieldErrors?.message}
              aria-describedby={fieldErrors?.message ? "c-message-err" : undefined}
            ></textarea>
            {fieldErrors?.message && (
              <span id="c-message-err" style={errorStyle}>
                {fieldErrors.message}
              </span>
            )}
          </div>

          {/* Honeypot: los usuarios no lo ven ni lo alcanzan con teclado; los bots lo rellenan. */}
          <div style={honeypotStyle} aria-hidden="true">
            <label htmlFor="c-website">WEBSITE</label>
            <input id="c-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {state.status === "error" && (
            <p role="alert" style={{ ...errorStyle, margin: "0 0 12px" }}>
              {state.message}
            </p>
          )}

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success" role="status">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
