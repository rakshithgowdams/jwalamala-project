import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
export default async function Page() {
  const { kn, locale } = await getUiStrings();
  const { db } = await requireUser("/account/early-access");
  const { data } = await db
    .from("posts")
    .select("*")
    .eq("status", "published")
    .gt("early_access_until", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);
  return (
    <div className="container page-shell">
      <h1>{kn.earlyAccess}</h1>
      {data?.length ? (
        data.map((p) => (
          <Link
            className="directory-link"
            key={p.id}
            href={"/account/early-access/" + p.id}
          >
            {pickText(locale, p.title_kn, p.title_en, p.title_hi)} ·{" "}
            {p.event_date}
          </Link>
        ))
      ) : (
        <p>{kn.noEarlyAccess}</p>
      )}
    </div>
  );
}
