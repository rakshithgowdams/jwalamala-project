import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getServerClient } from "@/lib/supabase/server";
import { voteSchema } from "@/lib/v4/engagement";
import {
  sameOrigin,
  readJson,
  requestIdentity,
  limitRequest,
  privateJson,
} from "@/lib/v4/server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const parsed = voteSchema.safeParse(await readJson(request));
    if (!parsed.success) return privateJson({ error: "validation" }, 400);
    const db = getAdminClient(),
      identity = await requestIdentity(request);
    if (!db || !identity) return privateJson({ error: "unavailable" }, 503);
    if (!(await limitRequest("vote:" + identity.ipHash, 60)))
      return privateJson({ error: "rate" }, 429);
    const auth = await getServerClient(),
      user = auth ? (await auth.auth.getUser()).data.user : null;
    const { error } = await db.rpc("record_v4_votes", {
      poll: parsed.data.poll_id,
      choices: parsed.data.option_indexes || [parsed.data.option_index],
      device: identity.deviceHash,
      actor: user?.id || null,
    });
    if (error) return privateJson({ error: "closed-or-already-voted" }, 409);
    const { data, error: resultError } = await db.rpc("v4_poll_results", {
      poll: parsed.data.poll_id,
    });
    if (resultError) return privateJson({ error: "unavailable" }, 503);
    const response = privateJson({ results: data || [] });
    response.cookies.set("jwalamala-device", identity.cookie, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
    return response;
  } catch {
    return privateJson({ error: "request" }, 400);
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!z.uuid().safeParse(id).success)
    return privateJson({ error: "validation" }, 400);
  const db = getAdminClient();
  if (!db) return privateJson({ error: "unavailable" }, 503);
  const { data, error } = await db.rpc("v4_poll_results", { poll: id });
  return error
    ? privateJson({ error: "unavailable" }, 503)
    : privateJson({ results: data || [] });
}
