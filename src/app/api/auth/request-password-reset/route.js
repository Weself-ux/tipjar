import crypto from "node:crypto";
import sql from "@/app/api/utils/sql";
import { rateLimit, getClientIP, isValidEmail } from "@/app/api/utils/auth-helpers";

export async function action({ request }) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(ip, "request-password-reset", 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many attempts. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return Response.json(
        { error: "Email and code are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: "Invalid code format." }, { status: 400 });
    }

    const rows = await sql("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (rows.length > 0) {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await sql("DELETE FROM password_reset_codes WHERE email = $1", [
        email.toLowerCase(),
      ]);
      await sql(
        "INSERT INTO password_reset_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)",
        [email.toLowerCase(), codeHash, expiresAt],
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Request password reset error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}