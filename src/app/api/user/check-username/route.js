import sql from "@/app/api/utils/sql";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get("username");

    if (!username || username.length < 5) {
      return Response.json({
        available: false,
        error: "Username must be at least 5 characters.",
      });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return Response.json({
        available: false,
        error: "Only lowercase letters, numbers, and underscores.",
      });
    }

    const rows = await sql("SELECT id FROM users WHERE username = $1", [
      username.toLowerCase(),
    ]);
    return Response.json({ available: rows.length === 0 });
  } catch (err) {
    console.error("Username check error:", err);
    return Response.json(
      { available: false, error: "Could not check username." },
      { status: 500 },
    );
  }
}
