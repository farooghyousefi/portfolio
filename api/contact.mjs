const MAX_BODY_BYTES = 16_384;
const routes = { de: "/de/#contact", en: "/#contact", fa: "/fa/#contact" };
const pageMessages = {
  de: { success: "Nachricht gesendet", failure: "Nachricht konnte nicht gesendet werden", back: "Zurück zur Website" },
  en: { success: "Message sent", failure: "Message could not be sent", back: "Back to the website" },
  fa: { success: "پیام ارسال شد", failure: "پیام ارسال نشد", back: "بازگشت به وب‌سایت" },
};

function reply(request, status, code, language = "en") {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (request.headers.get("accept")?.includes("text/html")) {
    const message = pageMessages[language][status === 200 ? "success" : "failure"];
    const direction = language === "fa" ? "rtl" : "ltr";
    return new Response(`<!doctype html><html lang="${language}" dir="${direction}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${message}</title><link rel="stylesheet" href="/styles.css"><main class="section-shell content-section"><h1>${message}</h1><p><a href="${routes[language]}">${pageMessages[language].back}</a></p></main></html>`, {
      status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return Response.json({ ok: status === 200, code }, { status, headers });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return reply(request, 405, "method_not_allowed");

    const origin = request.headers.get("origin");
    if (origin !== new URL(request.url).origin) return reply(request, 403, "forbidden");
    if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
      return reply(request, 415, "unsupported_media_type");
    }

    const declaredSize = Number(request.headers.get("content-length"));
    if (declaredSize > MAX_BODY_BYTES) return reply(request, 413, "too_large");
    const body = await request.text();
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) return reply(request, 413, "too_large");

    const fields = new URLSearchParams(body);
    const language = Object.hasOwn(routes, fields.get("lang")) ? fields.get("lang") : "en";
    if (fields.get("website")?.trim()) return reply(request, 200, "sent", language);

    const name = fields.get("name")?.trim() ?? "";
    const email = fields.get("email")?.trim() ?? "";
    const message = fields.get("message")?.trim() ?? "";
    const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
    if (!name || name.length > 120 || /[\r\n]/.test(name) || !validEmail || email.length > 254 || message.length < 10 || message.length > 4000) {
      return reply(request, 400, "invalid", language);
    }

    const key = process.env.RESEND_API_KEY;
    const recipient = process.env.CONTACT_TO_EMAIL;
    const sender = process.env.CONTACT_FROM_EMAIL;
    if (!key || !recipient || !sender) return reply(request, 503, "unavailable", language);

    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Portfolio <${sender}>`,
          to: [recipient],
          reply_to: email,
          subject: "New portfolio message",
          text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return reply(request, result.ok ? 200 : 502, result.ok ? "sent" : "delivery_failed", language);
    } catch {
      return reply(request, 502, "delivery_failed", language);
    }
  },
};
