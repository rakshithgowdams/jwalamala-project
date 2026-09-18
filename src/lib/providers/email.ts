import "server-only";
import { reserveBudget } from "./budget";
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  idempotencyKey: string,
  unsubscribeUrl?: string,
) {
  const key = process.env.RESEND_API_KEY,
    from = process.env.NEWSLETTER_FROM;
  if (!key || !from) throw Error("Email not configured");
  await reserveBudget("email", 1);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(unsubscribeUrl
        ? {
            headers: {
              "List-Unsubscribe": "<" + unsubscribeUrl + ">",
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("Email provider unavailable");
  return response.json() as Promise<{ id: string }>;
}
