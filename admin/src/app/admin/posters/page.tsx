import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import {
  PosterManager,
  type PosterRow,
} from "@/components/admin/v4/PosterManager";
import { v4 as t } from "@/content/strings.kn";

async function load() {
  const { db } = await requirePermission("ads.manage");
  const { data, error } = await db
    .from("ads")
    .select(
      "id,advertiser,shape,image_url,target_url,alt_kn,alt_en,alt_hi,target_pages,device,starts_at,ends_at,is_active,priority,impressions,clicks",
    )
    .neq("shape", "any")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Poster ads migration required");
  return { rows: (data || []) as PosterRow[], now: Date.now() };
}

export default async function Page() {
  const { rows, now } = await load();
  return (
    <>
      <div className="page-heading">
        <h1>ಪೋಸ್ಟರ್ ಮತ್ತು ಬ್ಯಾನರ್ ಜಾಹೀರಾತು</h1>
      </div>
      <div className="article-actions">
        <Link href="/admin/ad-settings" className="button button-outline">
          {t.adSlots}
        </Link>
        <Link href="/admin/business-ads" className="button button-outline">
          ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು
        </Link>
      </div>
      <PosterManager rows={rows} now={now} />
    </>
  );
}
