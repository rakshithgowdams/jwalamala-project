import "./lib/supabase-env.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAdminClient } from "@/lib/supabase/admin";
import { site } from "@/config/site";
import {
  POST_MEDIA_BUCKET,
  mapSocialItem,
  socialItems,
  type MappedSocialPost,
} from "@/lib/social/map";

const usage = `Usage: npx tsx --tsconfig scripts/tsconfig.json scripts/import-social.ts --file <export.json> [options]

  --file <path>     Apify facebook-posts-scraper or Instagram scraper JSON
  --dry-run         print counts by type; write nothing
  --limit N         process at most N items
  --since YYYY-MM-DD
  --help
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) {
  console.log(usage);
  process.exit(0);
}
const flag = (name: string) => argv.includes("--" + name);
const value = (name: string) => {
  const index = argv.indexOf("--" + name);
  return index >= 0 ? argv[index + 1] || "" : "";
};
const dryRun = flag("dry-run");
const limit = Math.max(0, Math.floor(Number(value("limit")) || 0));
const since = value("since");
const filePath = value("file") || argv.find((arg) => arg.endsWith(".json")) || "";

function refuse(reason: string): never {
  console.error(reason);
  process.exit(1);
}

if (!filePath) refuse("Pass --file path/to/export.json\n" + usage);

function counts() {
  return {
    article: { inserted: 0, skipped: 0, failed: 0 },
    video: { inserted: 0, skipped: 0, failed: 0 },
    short: { inserted: 0, skipped: 0, failed: 0 },
  };
}

const tallies = counts();
const bump = (
  type: MappedSocialPost["type"],
  kind: "inserted" | "skipped" | "failed",
) => {
  tallies[type][kind] += 1;
};

function printTallies() {
  for (const type of ["article", "video", "short"] as const) {
    const row = tallies[type];
    console.log(
      `${type}: inserted ${row.inserted} / skipped ${row.skipped} / failed ${row.failed}`,
    );
  }
}

async function storeImage(
  db: NonNullable<ReturnType<typeof getAdminClient>>,
  url: string,
  path: string,
) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "JwalamalaNews/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const ext = type.includes("png")
      ? "png"
      : type.includes("webp")
        ? "webp"
        : "jpg";
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength < 32 || body.byteLength > 5_242_880) return null;
    const object = `${path}.${ext}`;
    const { error } = await db.storage
      .from(POST_MEDIA_BUCKET)
      .upload(object, body, { contentType: type.split(";")[0], upsert: true });
    if (error) return null;
    return db.storage.from(POST_MEDIA_BUCKET).getPublicUrl(object).data.publicUrl;
  } catch {
    return null;
  }
}

async function uniqueSlug(
  db: NonNullable<ReturnType<typeof getAdminClient>>,
  base: string,
) {
  const { data } = await db
    .from("posts")
    .select("slug")
    .like("slug", base + "%")
    .limit(200);
  const taken = new Set((data || []).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

const raw = JSON.parse(await readFile(resolve(filePath), "utf8"));
let items = socialItems(raw);
if (since) {
  const cut = new Date(since + "T00:00:00.000Z").getTime();
  if (!Number.isFinite(cut)) refuse("--since must be YYYY-MM-DD");
  items = items.filter((item) => {
    const mapped = mapSocialItem(item);
    return mapped && Date.parse(mapped.published_at) >= cut;
  });
}
if (limit) items = items.slice(0, limit);

console.log(
  (dryRun ? "Dry-run" : "Import") +
    `: ${items.length} items from ${filePath}` +
    (since ? ` since ${since}` : ""),
);

if (dryRun) {
  for (const item of items) {
    const mapped = mapSocialItem(item);
    if (!mapped) {
      tallies.article.failed += 1;
      continue;
    }
    bump(mapped.type, "inserted");
  }
  printTallies();
  process.exit(0);
}

const db = getAdminClient();
if (!db) refuse("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

const { data: categories, error: categoryError } = await db
  .from("categories")
  .select("id,slug")
  .in("slug", ["social-posters", "social-videos"]);
if (categoryError || !categories?.length)
  refuse("social-posters / social-videos categories are missing. Apply the migration first.");
const categoryId = Object.fromEntries(categories.map((row) => [row.slug, row.id]));

for (const item of items) {
  const mapped = mapSocialItem(item);
  if (!mapped) {
    tallies.article.failed += 1;
    continue;
  }
  try {
    const { data: byUrl } = await db
      .from("posts")
      .select("id")
      .eq("social_post_url", mapped.social_post_url)
      .maybeSingle();
    if (byUrl) {
      bump(mapped.type, "skipped");
      continue;
    }
    if (mapped.video_url) {
      const { data: byVideo } = await db
        .from("posts")
        .select("id")
        .eq("video_url", mapped.video_url)
        .maybeSingle();
      if (byVideo) {
        bump(mapped.type, "skipped");
        continue;
      }
    }
    const stored: string[] = [];
    for (const [index, url] of mapped.image_urls.entries()) {
      const kept =
        (await storeImage(
          db,
          url,
          `${mapped.social_platform}/${mapped.social_post_id}-${index}`,
        )) || url;
      stored.push(kept);
    }
    const thumbnail =
      stored[0] ||
      (await storeImage(
        db,
        mapped.thumbnail_url,
        `${mapped.social_platform}/${mapped.social_post_id}-thumb`,
      )) ||
      mapped.thumbnail_url;
    const slug = await uniqueSlug(db, mapped.slug);
    const { data: inserted, error } = await db
      .from("posts")
      .insert({
        type: mapped.type,
        status: mapped.status,
        source: mapped.source,
        slug,
        title_kn: mapped.title_kn,
        title_translit: slug.replace(/-/g, " "),
        summary_kn: mapped.summary_kn || mapped.title_kn,
        body_html: mapped.summary_kn
          ? `<p>${mapped.summary_kn.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "</p><p>")}</p>`
          : "",
        thumbnail_url: thumbnail,
        image_credit: site.fullName,
        image_layout: mapped.image_layout,
        media_images: stored.slice(0, 3).map((url) => ({
          url,
          credit: site.fullName,
        })),
        video_provider: mapped.video_provider,
        video_id: mapped.video_id,
        video_url: mapped.video_url,
        published_at: mapped.published_at,
        event_date: mapped.event_date,
        view_count: mapped.view_count,
        social_platform: mapped.social_platform,
        social_post_url: mapped.social_post_url,
        social_post_id: mapped.social_post_id,
        is_seed: false,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("insert failed:", mapped.social_post_url, error?.message);
      bump(mapped.type, "failed");
      continue;
    }
    const category = categoryId[mapped.categorySlug];
    if (category) {
      const { error: linkError } = await db.from("post_categories").insert({
        post_id: inserted.id,
        category_id: category,
        is_primary: true,
      });
      if (linkError)
        console.error("category link failed:", mapped.social_post_url, linkError.message);
    }
    bump(mapped.type, "inserted");
  } catch (error) {
    console.error("failed:", mapped.social_post_url, error);
    bump(mapped.type, "failed");
  }
}

printTallies();
