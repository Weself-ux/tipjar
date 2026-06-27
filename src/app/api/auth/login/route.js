import argon2 from "argon2";
import sql from "@/app/api/utils/sql";
import {
  createSession,
  rateLimit,
  getClientIP,
  isValidEmail,
} from "@/app/api/utils/auth-helpers";

export async function action({ request }) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(ip, "login", 10, 60 * 60 * 1000); // 10 per hour
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Too many login attempts. Try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Please fill in all fields." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    // Find user by email
    const rows = await sql(
      "SELECT id, full_name, email, username, password_hash, wallet_address, date_of_birth, created_at FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (rows.length === 0) {
      return Response.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    const user = rows[0];

    // Verify password with argon2
    const validPassword = await argon2.verify(user.password_hash, password);
    if (!validPassword) {
      return Response.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    // Create session
    const token = await createSession(user.id);

    return Response.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        walletAddress: user.wallet_address,
        dateOfBirth: user.date_of_birth,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
