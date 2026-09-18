import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sameOrigin, privateJson, limitRequest } from "@/lib/v4/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  const db = await getServerClient(),
    admin = getAdminClient();
  if (!db || !admin) return privateJson({ error: "unavailable" }, 503);
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return privateJson({ error: "unauthorized" }, 401);
  const checks = await Promise.all(
    ["content.edit", "content.create", "ads.manage", "community.manage"].map(
      (requested) => db.rpc("has_permission", { requested }),
    ),
  );
  if (!checks.some((c) => c.data === true))
    return privateJson({ error: "forbidden" }, 403);
  if (!(await limitRequest("media:" + user.id, 60)))
    return privateJson({ error: "rate" }, 429);
  try {
    const reader = request.body?.getReader();
    if (!reader) return privateJson({ error: "invalid" }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2200000) {
        await reader.cancel();
        return privateJson({ error: "too_large" }, 413);
      }
      chunks.push(value);
    }
    const bounded = new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type") || "" },
        body: Buffer.concat(chunks),
      }),
      form = await bounded.formData(),
      file = form.get("file"),
      ad = form.get("kind") === "ad";
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      ) ||
      file.size > 1048576
    )
      return privateJson({ error: "image_required" }, 400);
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
      animated: false,
    })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    if (buffer.length > (ad ? 300000 : 1048576))
      return privateJson({ error: "image_too_large" }, 400);
    const path = user.id + "/" + randomUUID() + ".webp";
    const { error } = await admin.storage
      .from("site-assets")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    return privateJson({
      url: admin.storage.from("site-assets").getPublicUrl(path).data.publicUrl,
    });
  } catch {
    return privateJson({ error: "upload_failed" }, 400);
  }
}
