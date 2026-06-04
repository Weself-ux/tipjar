import { rateLimit, getClientIP } from "@/app/api/utils/auth-helpers";

// Backend email proxy — avoids CORS issues with EmailJS from the browser
export async function action({ request }) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(ip, "email-send", 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many requests. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { serviceId, templateId, templateParams, publicKey } = body;

    if (!serviceId || !templateId || !templateParams || !publicKey) {
      return Response.json(
        { error: "Missing email parameters." },
        { status: 400 },
      );
    }

    // Call EmailJS from the server — no CORS issues here
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        template_params: templateParams,
        user_id: publicKey,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("EmailJS error:", res.status, text);
      return Response.json(
        { error: "Email service error. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return Response.json({ error: "Could not send email." }, { status: 500 });
  }
}
