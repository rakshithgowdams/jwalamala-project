import { safePushEndpoint, pushTopics } from "@/lib/push/schema";
import { readJson } from "@/lib/v4/server";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
const schema = z.object({
  endpoint: z.url().max(3000).refine(safePushEndpoint),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(10).max(100),
  }),
  topics: z.array(z.enum(pushTopics)).max(5),
});
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getServerClient();
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const p = schema.safeParse(await readJson(req));
    if (!p.success)
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 },
      );
    const { error } = await db.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: p.data.endpoint,
        p256dh: p.data.keys.p256dh,
        auth: p.data.keys.auth,
        topics: p.data.topics,
      },
      { onConflict: "endpoint" },
    );
    return NextResponse.json({ ok: !error }, { status: error ? 400 : 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getServerClient();
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const p = z
      .object({ endpoint: z.url().max(3000) })
      .parse(await readJson(req));
    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", p.endpoint);
    return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
  } catch {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
}
