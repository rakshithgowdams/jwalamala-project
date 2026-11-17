import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/v4/permissions";
import { v4Resources, type V4Resource } from "@/lib/v4/admin-schema";
import {
  ResourceEditor,
  type Choice,
} from "@/components/admin/v4/ResourceEditor";
import { getUiStrings } from "@/lib/i18n/server";

const MATHAS_SQL = `create table if not exists public.mathas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_kn text not null,
  name_en text not null default '',
  name_hi text not null default '',
  district_id uuid references public.places(id),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mathas enable row level security;

create table if not exists public.post_mathas (
  post_id uuid not null references public.posts(id) on delete cascade,
  matha_id uuid not null references public.mathas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, matha_id)
);
alter table public.post_mathas enable row level security;

create index if not exists mathas_menu_idx on public.mathas (is_active, sort_order, slug);
create index if not exists post_mathas_matha_idx on public.post_mathas (matha_id);

drop policy if exists mathas_read on public.mathas;
create policy mathas_read on public.mathas
  for select using (is_active or public.is_staff());
drop policy if exists mathas_insert on public.mathas;
create policy mathas_insert on public.mathas
  for insert to authenticated
  with check (public.has_permission('content.edit'));
drop policy if exists mathas_update on public.mathas;
create policy mathas_update on public.mathas
  for update to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));
drop policy if exists mathas_delete on public.mathas;
create policy mathas_delete on public.mathas
  for delete to authenticated
  using (public.has_role('admin'));

drop policy if exists post_mathas_read on public.post_mathas;
create policy post_mathas_read on public.post_mathas
  for select using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists post_mathas_insert on public.post_mathas;
create policy post_mathas_insert on public.post_mathas
  for insert to authenticated
  with check (public.can_edit_post(post_id));
drop policy if exists post_mathas_update on public.post_mathas;
create policy post_mathas_update on public.post_mathas
  for update to authenticated
  using (public.can_edit_post(post_id))
  with check (public.can_edit_post(post_id));
drop policy if exists post_mathas_delete on public.post_mathas;
create policy post_mathas_delete on public.post_mathas
  for delete to authenticated
  using (public.has_role('admin') or public.can_edit_post(post_id));

grant select on public.mathas, public.post_mathas to anon;
grant select, insert, update, delete on public.mathas, public.post_mathas to authenticated;

drop trigger if exists touch_update on public.mathas;
create trigger touch_update before update on public.mathas
  for each row execute function public.touch_updated_at();
drop trigger if exists audit_changes on public.mathas;
create trigger audit_changes after insert or update or delete on public.mathas
  for each row execute function public.audit_content();
drop trigger if exists audit_changes on public.post_mathas;
create trigger audit_changes after insert or update or delete on public.post_mathas
  for each row execute function public.audit_content();

insert into public.mathas (id, slug, name_kn, name_en, name_hi, sort_order, is_active)
values
(
  '00000000-0000-4000-8000-000000000101',
  'shravanabelagola-matha',
  'ಶ್ರೀ ಕ್ಷೇತ್ರ ಶ್ರವಣಬೆಳಗೊಳ ದಿಗಂಬರ ಜೈನ ಮಠ',
  'Shri Kshetra Shravanabelagola Digambar Jain Math',
  'श्री क्षेत्र श्रवणबेलगोला दिगंबर जैन मठ',
  10,
  true
),
(
  '00000000-0000-4000-8000-000000000102',
  'hombuja-matha',
  'ಹೊಂಬುಜ ದಿಗಂಬರ ಜೈನ ಮಹಾ ಸಂಸ್ಥಾನ ಮಠ',
  'Hombuja Digambar Jain Maha Sansthan Math',
  'होम्बुज दिगंबर जैन महा संस्थान मठ',
  20,
  true
),
(
  '00000000-0000-4000-8000-000000000103',
  'swadi-matha',
  'ಸ್ವಾದಿ ದಿಗಂಬರ ಜೈನ ಮಠ',
  'Swadi Digambar Jain Math',
  'स्वादि दिगंबर जैन मठ',
  30,
  true
)
on conflict (slug) do update set
  name_kn = excluded.name_kn,
  name_en = excluded.name_en,
  name_hi = excluded.name_hi,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;`;

export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (!Object.hasOwn(v4Resources, resource)) notFound();
  const name = resource as V4Resource,
    config = v4Resources[name];
  const { db } = await requirePermission(config.permission);
  const query = db.from(name).select("*");
  const { data, error } = await (name === "places"
    ? query
        .order("is_district", { ascending: false })
        .order("sort_order")
        .order("name_kn")
        .limit(1000)
    : name === "mathas"
      ? query.order("sort_order").order("name_kn").limit(200)
      : query.order("created_at", { ascending: false }).limit(200));
  if (error) {
    const { tr, l } = await getUiStrings();
    const missing =
      /(schema cache|does not exist|could not find|relation)/i.test(error.message || "");
    return (
      <>
        <div className="page-heading">
          <h1>{l(config.title)}</h1>
        </div>
        <p role="alert">
          {name === "mathas" && missing
            ? tr({
                en: "Jain mathas table is missing. Run supabase/migrations/20261117120000_mathas.sql in the Supabase SQL Editor, then reload.",
                kn: "ಜೈನ ಮಠಗಳ ಟೇಬಲ್ ಇಲ್ಲ. Supabase SQL Editor ನಲ್ಲಿ 20261117120000_mathas.sql ರನ್ ಮಾಡಿ, ನಂತರ ರಿಲೋಡ್ ಮಾಡಿ.",
                hi: "जैन मठ टेबल नहीं है। Supabase SQL Editor में 20261117120000_mathas.sql चलाएँ, फिर रीलोड करें।",
              })
            : tr({
                en: "This admin table is not set up yet. Run the matching Supabase migration, then reload.",
                kn: "ಈ ನಿರ್ವಹಣಾ ಟೇಬಲ್ ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ. ಹೊಂದುವ Supabase ಮೈಗ್ರೇಷನ್ ರನ್ ಮಾಡಿ, ನಂತರ ರಿಲೋಡ್ ಮಾಡಿ.",
                hi: "यह एडमिन टेबल अभी सेट नहीं है। मिलती Supabase माइग्रेशन चलाएँ, फिर रीलोड करें।",
              })}
        </p>
        <p role="status">{error.message}</p>
        {name === "mathas" && missing ? (
          <pre className="sql-setup-block" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>
            {MATHAS_SQL}
          </pre>
        ) : null}
      </>
    );
  }
  const choices: Record<string, Choice[]> = {};
  for (const table of [
    "places",
    "tags",
    "events",
    "posts",
    "liveblogs",
    "categories",
    "ad_campaigns",
  ]) {
    const result = await db
      .from(table)
      .select(
        table === "ad_campaigns"
          ? "id,advertiser"
          : table === "posts"
            ? "id,title_kn"
            : table === "liveblogs"
              ? "id,title_kn"
              : table === "places"
                ? "id,name_kn,name_en,district,is_district"
                : "id,name_kn",
      )
      .limit(table === "places" ? 2000 : 500);
    choices[table] = (result.data || []).map(
      (row: Record<string, unknown>) => ({
        id: String(row.id),
        label: String(row.advertiser || row.title_kn || row.name_kn),
        ...(table === "places" && {
          name_kn: String(row.name_kn),
          name_en: (row.name_en as string) || "",
          district: (row.district as string) || "",
          is_district: Boolean(row.is_district),
        }),
      }),
    );
  }
  let relationships: { parent: string; post: string; order: number }[] = [];
  if (name === "topics" || name === "series") {
    const result = await db
      .from(name === "topics" ? "topic_pins" : "series_items")
      .select("*");
    relationships = (result.data || []).map((row) => ({
      parent: row.topic_id || row.series_id,
      post: row.post_id,
      order: row.sort_order ?? row.episode_no,
    }));
  }
  const { l } = await getUiStrings();
  return (
    <>
      <div className="page-heading">
        <h1>{l(config.title)}</h1>
      </div>
      <ResourceEditor
        resource={name}
        rows={data || []}
        choices={choices}
        relationships={relationships}
      />
    </>
  );
}
