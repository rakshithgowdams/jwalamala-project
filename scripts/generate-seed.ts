import { writeFile } from "node:fs/promises";
import { categories, demoPosts, demoEvents } from "../src/lib/data/demo";
const quote = (v: string | null | undefined) =>
  v === null || v === undefined ? "null" : "'" + v.replaceAll("'", "''") + "'";
const text = (v: string | undefined) => quote(v ?? "");
const uuid = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const sql = [
  "-- Development fixtures only. Every row is marked is_seed.\nbegin;",
];
for (const [cIndex, c] of categories.entries())
  sql.push(
    `insert into public.categories(id,slug,name_kn,name_en,name_hi,sort_order,is_seed) values('${uuid(cIndex + 1)}',${quote("seed-" + c.slug)},${quote(c.name_kn)},${quote(c.name_en)},${text(c.name_hi)},${cIndex},true) on conflict(id) do nothing;`,
  );
for (const [i, e] of demoEvents.entries())
  sql.push(
    `insert into public.events(id,slug,name_kn,name_en,name_hi,start_date,end_date,place,district,organiser,organiser_en,organiser_hi,description_kn,description_en,description_hi,is_seed) values('${uuid(100 + i)}',${[e.slug, e.name_kn, e.name_en].map(quote).join(",")},${text(e.name_hi)},${[e.start_date, e.end_date, e.place, e.district, e.organiser].map(quote).join(",")},${text(e.organiser_en)},${text(e.organiser_hi)},${quote(e.description_kn)},${text(e.description_en)},${text(e.description_hi)},true) on conflict(id) do nothing;`,
  );
for (const [i, p] of demoPosts.entries()) {
  sql.push(
    `insert into public.posts(id,slug,title_kn,title_en,title_hi,title_translit,summary_kn,summary_en,summary_hi,body_html,body_en,body_hi,event_date,event_place,published_at,type,status,thumbnail_url,is_seed) values('${uuid(1000 + i)}',${[p.slug, p.title_kn, p.title_en].map(quote).join(",")},${text(p.title_hi)},${[p.title_translit, p.summary_kn].map(quote).join(",")},${text(p.summary_en)},${text(p.summary_hi)},${quote(p.body_html)},${text(p.body_en)},${text(p.body_hi)},${[p.event_date, p.event_place, p.published_at, p.type, p.status, p.thumbnail_url].map(quote).join(",")},true) on conflict(id) do nothing;`,
  );
  for (const [ci, slug] of [...new Set(p.category_slugs)].entries()) {
    const index = categories.findIndex((c) => c.slug === slug);
    sql.push(
      `insert into public.post_categories(post_id,category_id,is_primary) values('${uuid(1000 + i)}','${uuid(index + 1)}',${ci === 0}) on conflict(post_id,category_id) do nothing;`,
    );
  }
}
sql.push("commit;");
await writeFile("supabase/seed.sql", sql.join("\n"), "utf8");
console.log(
  "Wrote 12 categories, 20 posts, and 5 events. No database modified.",
);
