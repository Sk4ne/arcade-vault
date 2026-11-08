"use server";

import { Resend } from "resend";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      message: string;
      fields?: Partial<Record<"name" | "email" | "message", string>>;
    };

const NAME_MAX = 80;
const EMAIL_MAX = 120;
const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Quita saltos de línea para evitar inyección de cabeceras en el asunto.
  const name = field(formData, "name").replace(/[\r\n]+/g, " ").trim();
  const email = field(formData, "email");
  const message = field(formData, "message");
  const website = field(formData, "website");

  // Honeypot: éxito simulado, sin enviar nada y sin delatar la detección.
  if (website) {
    return { status: "success", name: name || "JUGADOR" };
  }

  const fields: Partial<Record<"name" | "email" | "message", string>> = {};
  if (!name) fields.name = "Escribe tu nombre.";
  else if (name.length > NAME_MAX) fields.name = `Máximo ${NAME_MAX} caracteres.`;

  if (!email) fields.email = "Escribe tu correo electrónico.";
  else if (email.length > EMAIL_MAX) fields.email = `Máximo ${EMAIL_MAX} caracteres.`;
  else if (!EMAIL_RE.test(email)) fields.email = "Correo electrónico no válido.";

  if (!message) fields.message = "Escribe un mensaje.";
  else if (message.length > MESSAGE_MAX) fields.message = `Máximo ${MESSAGE_MAX} caracteres.`;

  if (Object.keys(fields).length > 0) {
    return { status: "error", message: "Revisa los campos marcados.", fields };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno de Resend.");
    return {
      status: "error",
      message: "El envío no está disponible por ahora. Inténtalo más tarde.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Nuevo mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });

    if (error) {
      console.error("[contact] Resend rechazó el envío:", error.name);
      return {
        status: "error",
        message: "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.",
      };
    }
  } catch {
    console.error("[contact] Fallo inesperado al enviar con Resend.");
    return {
      status: "error",
      message: "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.",
    };
  }

  return { status: "success", name };
}
