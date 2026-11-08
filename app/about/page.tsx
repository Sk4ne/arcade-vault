import type { Metadata } from "next";
import { HighlightIcon, type HighlightKind } from "@/components/about/highlight-icon";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description:
    "La misión de Arcade Vault: preservar y celebrar los arcades clásicos, accesibles para todos. Escríbenos.",
};

const HIGHLIGHTS: { kind: HighlightKind; text: string; color: string }[] = [
  { kind: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { kind: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { kind: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export default function AboutPage() {
  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y
          celebrar los arcades que definieron una generación, haciéndolos accesibles para todos, en
          cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={h.kind}
              className={"highlight " + h.color}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <HighlightIcon kind={h.kind} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <Reveal className="about-divider">
        <div className="div-bar"></div>
        <div className="div-pixels" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </Reveal>

      {/* CONTACT */}
      <Reveal className="about-contact">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m"></span>SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          {/* Marcador temporal: el Paso 7 lo reemplaza por <ContactForm /> con la Server Action. */}
          <form className="contact-form">
            <div className="field">
              <label htmlFor="c-name">NOMBRE</label>
              <input id="c-name" name="name" placeholder="px_kai" />
            </div>
            <div className="field">
              <label htmlFor="c-email">CORREO ELECTRÓNICO</label>
              <input id="c-email" name="email" type="email" placeholder="jugador@vault.gg" />
            </div>
            <div className="field">
              <label htmlFor="c-message">MENSAJE</label>
              <textarea
                id="c-message"
                name="message"
                rows={5}
                placeholder="Cuéntanos qué tienes en mente…"
              ></textarea>
            </div>
            <button className="btn xl press" type="submit" style={{ width: "100%" }}>
              ▶&nbsp;&nbsp;ENVIAR MENSAJE
            </button>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
