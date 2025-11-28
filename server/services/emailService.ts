/**
 * Email service using Mailgun
 */

import FormData from "form-data";
import Mailgun from "mailgun.js";
import { env } from "../config/env";
import { getEmailTranslations, type EmailLanguage } from "./emailTranslations";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Creates a Mailgun client instance
 */
function createMailgunClient() {
  if (!env.MAILGUN_API_KEY) {
    throw new Error("MAILGUN_API_KEY no está configurado");
  }

  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: env.MAILGUN_API_KEY,
    // Para dominios EU, descomenta la siguiente línea:
    // url: "https://api.eu.mailgun.net"
  });

  return mg;
}

/**
 * Sends an email using Mailgun
 */
async function sendEmail(options: EmailOptions): Promise<any> {
  const { to, subject, html, text } = options;

  // Si Mailgun no está configurado, solo loguear en desarrollo
  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
    if (env.NODE_ENV === "development") {
      console.log("\n📧 ===== EMAIL (Development Mode) =====");
      console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
      console.log(`Subject: ${subject}`);
      console.log(`\n${text || (html ? html.replace(/<[^>]*>/g, "") : "")}`);
      console.log("========================================\n");
      return { id: "dev-mode", message: "Email logged in development mode" };
    } else {
      throw new Error(
        "Mailgun no está configurado. Por favor configura MAILGUN_API_KEY y MAILGUN_DOMAIN"
      );
    }
  }

  try {
    const mg = createMailgunClient();
    const from = env.MAILGUN_FROM || `noreply@${env.MAILGUN_DOMAIN}`;
    const recipients = Array.isArray(to) ? to : [to];

    const messageData: any = {
      from,
      to: recipients,
      subject,
    };

    if (text) {
      messageData.text = text;
    }
    if (html) {
      messageData.html = html;
    }

    const data = await mg.messages.create(env.MAILGUN_DOMAIN, messageData);
    console.log(`✅ Email enviado exitosamente:`, data);
    return data;
  } catch (error: any) {
    console.error("❌ Error enviando email con Mailgun:", error);
    throw error;
  }
}

/**
 * Sends a password reset email with dynamic language support
 * @param email - User email address
 * @param token - Password reset token
 * @param deeplinkUrl - Deeplink URL for mobile app (investamind://)
 * @param webUrl - Web URL as fallback (http://)
 * @param language - User's preferred language
 */
async function sendPasswordResetEmail(
  email: string,
  token: string,
  deeplinkUrl: string,
  webUrl: string,
  language: EmailLanguage = "en"
): Promise<any> {
  const t = getEmailTranslations(language);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.greeting}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Investamind</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <h2 style="color: #333; margin-top: 0;">${t.greeting}</h2>
          <p>${t.intro}</p>
          <p>${t.instruction}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${webUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${t.button}
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">${t.linkText}</p>
          <p style="font-size: 12px; color: #667eea; word-break: break-all;">${webUrl}</p>
          <p style="font-size: 12px; color: #666; margin-top: 15px;">
            ${language === 'es' ? 'Si tienes la app instalada, también puedes usar este enlace directo:' : 'If you have the app installed, you can also use this direct link:'}
          </p>
          <p style="font-size: 12px; color: #667eea; word-break: break-all;">${deeplinkUrl}</p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            ${t.expiration}
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            ${t.footer}
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
${t.subject}

${t.intro}

${t.instruction}

${language === 'es' ? 'Enlace para la app móvil:' : 'Mobile app link:'}
${deeplinkUrl}

${language === 'es' ? 'Enlace web (alternativo):' : 'Web link (alternative):'}
${webUrl}

${t.expiration}

${t.footer}
  `;

  return await sendEmail({
    to: email,
    subject: t.subject,
    html,
    text,
  });
}

export const emailService = {
  sendEmail,
  sendPasswordResetEmail,
};

