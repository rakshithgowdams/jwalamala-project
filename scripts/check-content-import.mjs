import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { buildContentImport } from "./lib/content-import.mjs";

const db = new PGlite({extensions: {pg_trgm, unaccent}});
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb DEFAULT '{}',phone text,phone_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.role',true),'')$$;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL("../supabase/release/01-schema.sql", import.meta.url), "utf8"));
  const content = await buildContentImport();
  assert.equal(await readFile(new URL("../supabase/release/03-content.sql", import.meta.url), "utf8"), content.sql, "Regenerate the content bundle after editing demo data");
  // A category may already exist with a different UUID. Its identity must be retained.
  const category = (await db.query("INSERT INTO public.categories(slug,name_kn) VALUES('news','Existing news') RETURNING id")).rows[0].id;
  await db.exec(content.sql);
  for (const [table, count] of Object.entries(content.counts)) {
    assert.equal(Number((await db.query(`SELECT count(*) AS n FROM public.${table}`)).rows[0].n), count, table);
  }
  assert.equal((await db.query("SELECT id FROM public.categories WHERE slug='news'")).rows[0].id, category);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.posts WHERE is_seed AND place_id IS NOT NULL")).rows[0].n), 20);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.categories WHERE slug LIKE 'seed-%'")).rows[0].n), 0);
  const post = content.rows.posts[0];
  await db.query("UPDATE public.posts SET title_en='Editor revision' WHERE id=$1", [post.id]);
  await db.exec(content.sql);
  assert.equal((await db.query("SELECT title_en FROM public.posts WHERE id=$1", [post.id])).rows[0].title_en, "Editor revision");
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.posts")).rows[0].n), 20);
  await db.exec("SET ROLE anon; SET request.jwt.claim.role='anon'");
  const listing = (await db.query("SELECT public.list_public_posts($1::jsonb,1,24) result", [JSON.stringify({state:"Karnataka",district:"ಹಾಸನ",city:"shravanabelagola"})])).rows[0].result;
  assert.ok(JSON.stringify(listing).includes(post.slug), "Location-filtered listing must return imported articles");
  await assert.rejects(db.query("INSERT INTO public.posts(title_kn,slug) VALUES('Unauthorized','unauthorized')"));
  await db.exec("RESET ROLE; SET request.jwt.claim.role='service_role'");
  await db.query("UPDATE public.posts SET is_seed=false WHERE id=$1", [post.id]);
  await assert.rejects(db.exec(content.sql), /already used by editorial content/);
  await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT is_seed FROM public.posts WHERE id=$1", [post.id])).rows[0].is_seed, false);
  assert.equal(Number((await db.query("SELECT count(*) n FROM public.provider_settings WHERE enabled")).rows[0].n), 0);
  assert.equal(Number((await db.query("SELECT count(*) n FROM auth.users")).rows[0].n), 0);
  console.log("PASS: all content counts, category mapping, location filtering, idempotency, editorial preservation, anonymous write protection, and disabled integrations.");
} finally { await db.close(); }
