import argon2 from "argon2";
import sql from "@/app/api/utils/sql";
import {
  rateLimit,
  getClientIP,
  isValidEmail,
  validatePassword,
} from "@/app/api/utils/auth-helpers";

export async function action({ request }) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(ip, "reset-password", 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many attempts. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return Response.json(
        { error: "Email and new password are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const passError = validatePassword(newPassword);
    if (passError) {
      return Response.json({ error: passError }, { status: 400 });
    }

    // Check user exists
    const rows = await sql("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (rows.length === 0) {
      return Response.json(
        { error: "No account found with this email." },
        { status: 404 },
      );
    }

    // Hash new password with argon2
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    // Update password
    await sql("UPDATE users SET password_hash = $1 WHERE email = $2", [
      passwordHash,
      email.toLowerCase(),
    ]);

    // Invalidate all existing sessions for this user
    await sql("DELETE FROM sessions WHERE user_id = $1", [rows[0].id]);

    return Response.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
