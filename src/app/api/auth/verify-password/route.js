import argon2 from "argon2";
import sql from "@/app/api/utils/sql";
import {
  validateSession,
  rateLimit,
  getClientIP,
} from "@/app/api/utils/auth-helpers";

export async function action({ request }) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ip = getClientIP(request);
    const limit = rateLimit(ip, "verify-password", 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many attempts. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return Response.json(
        { error: "Password is required." },
        { status: 400 },
      );
    }

    const rows = await sql(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id],
    );
    if (rows.length === 0) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const validPassword = await argon2.verify(rows[0].password_hash, password);
    if (!validPassword) {
      return Response.json({ error: "Incorrect password." }, { status: 401 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Verify password error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}