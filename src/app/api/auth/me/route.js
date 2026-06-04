import { validateSession } from "@/app/api/utils/auth-helpers";

export async function loader({ request }) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    return Response.json({ user });
  } catch (err) {
    console.error("Auth check error:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
