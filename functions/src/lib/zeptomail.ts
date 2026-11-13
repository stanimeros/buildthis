import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

/**
 * Transactional email through Zoho ZeptoMail (https://www.zoho.com/zeptomail/), the same account
 * as stanimeros.com and Postly. `FROM_EMAIL` is on stanimeros.com because that domain has SPF/DKIM
 * set up on this account; mail from an unverified domain lands in spam.
 */
export const ZEPTOMAIL_TOKEN = defineSecret("ZEPTOMAIL_TOKEN");

/** The account is on zoho.com, so the US data centre. */
const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";
const FROM_EMAIL = "buildthis@stanimeros.com";
const FROM_NAME = "BuildThis";

/**
 * Escapes anything a user wrote before it goes into an email's HTML: a problem title carrying
 * markup would otherwise render as live HTML in the inbox.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Throws on any failure; the trigger logs it and moves on. */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const token = ZEPTOMAIL_TOKEN.value().trim();
  if (!token) throw new Error("ZEPTOMAIL_TOKEN is not configured");
  // The dashboard shows the token with its "Zoho-enczapikey " prefix; take it either way.
  const auth = /^zoho-enczapikey /i.test(token) ? token : `Zoho-enczapikey ${token}`;

  const response = await fetch(ZEPTOMAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth,
    },
    body: JSON.stringify({
      from: { address: FROM_EMAIL, name: FROM_NAME },
      to: [{ email_address: { address: params.to } }],
      subject: params.subject,
      htmlbody: params.html,
      textbody: params.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    request_id?: string;
    message?: string;
    data?: { error_code?: string; message?: string };
    error?: { code?: string; message?: string; details?: { code?: string; message?: string }[] };
  };
  if (!response.ok || !data.request_id) {
    // Two error shapes in the docs: { data: { error_code, message } } and
    // { error: { code, message, details } }.
    const err = data.error ?? {};
    logger.warn("zeptomail_send_failed", {
      httpStatus: response.status,
      code: err.code ?? data.data?.error_code,
      reason: err.message ?? data.data?.message ?? data.message,
      detail: err.details?.[0]?.message ?? err.details?.[0]?.code,
    });
    throw new Error("The email could not be sent.");
  }
}
