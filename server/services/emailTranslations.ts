/**
 * Email translations for password reset emails
 */

export const emailTranslations = {
  en: {
    subject: "Reset Your Password - Investamind",
    greeting: "Reset Your Password",
    intro: "We received a request to reset the password for your account.",
    instruction: "Click the button below to create a new password:",
    button: "Reset Password",
    linkText: "Or copy and paste this link in your browser:",
    expiration: "This link will expire in 1 hour. If you didn't request this change, you can ignore this email.",
    footer: `© ${new Date().getFullYear()} Investamind. All rights reserved.`,
  },
  es: {
    subject: "Recuperar tu contraseña - Investamind",
    greeting: "Recuperar tu contraseña",
    intro: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.",
    instruction: "Haz clic en el siguiente botón para crear una nueva contraseña:",
    button: "Restablecer Contraseña",
    linkText: "O copia y pega este enlace en tu navegador:",
    expiration: "Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este email.",
    footer: `© ${new Date().getFullYear()} Investamind. Todos los derechos reservados.`,
  },
};

export type EmailLanguage = "en" | "es";

export function getEmailTranslations(language: string = "en") {
  const lang = language === "es" ? "es" : "en";
  return emailTranslations[lang];
}

