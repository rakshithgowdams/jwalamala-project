import { getServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getServerClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { endpoint } = await req.json();
    if (typeof endpoint !== "string") throw new Error();
    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
