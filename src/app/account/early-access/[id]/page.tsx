import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { cleanHtml } from "@/lib/utils/sanitize";
import { LiteVideoEmbed } from "@/components/news/LiteVideoEmbed";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { kn, locale } = await getUiStrings();
  const { db } = await requireUser("/account/early-access"),
    { id } = await params;
  const { data: p } = await db
    .from("posts")
    .select(
      "title_kn,title_en,summary_kn,summary_en,body_html,body_en,video_url,thumbnail_url",
    )
    .eq("id", id)
    .eq("status", "published")
    .gt("early_access_until", new Date().toISOString())
    .maybeSingle();
  if (!p) notFound();
  const title = pickText(locale, p.title_kn, p.title_en);
  return (
    <div className="container page-shell">
      <p className="notice">{kn.earlyAccess}</p>
      <h1>{title}</h1>
      <p>{pickText(locale, p.summary_kn, p.summary_en)}</p>
      {p.video_url && (
        <LiteVideoEmbed
          url={p.video_url}
          thumbnail={p.thumbnail_url}
          title={title}
        />
      )}
      <div
        className="prose"
        dangerouslySetInnerHTML={{
          __html: cleanHtml(pickText(locale, p.body_html, p.body_en)),
        }}
      />
    </div>
  );
}
