import { notFound } from "next/navigation";
import { getV4Rows } from "@/lib/v4/queries";
import { LazyGalleryViewer as GalleryViewer } from "@/components/ui/LazyComponents";
import { AdSlot } from "@/components/ads/AdSlot";
import { SampleNotice } from "@/components/ui/Primitives";
import { formatDate } from "@/lib/utils/dates";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { locale } = await getUiStrings();
  const { slug } = await params;
  const row = (await getV4Rows("galleries")).find((row) => row.slug === slug);
  if (!row || row.status !== "published") notFound();
  return (
    <div className="container page-shell">
      {row.is_seed && <SampleNotice />}
      <div className="page-heading">
        <h1>{pickText(locale, row.title_kn, row.title_en, row.title_hi)}</h1>
        <p>
          {pickText(
            locale,
            row.description_kn,
            row.description_en,
            row.description_hi,
          )}
        </p>
        <p>{formatDate(row.event_date, false, locale)}</p>
      </div>
      <AdSlot placement="gallery-top" />
      <GalleryViewer images={row.images} />
      <AdSlot placement="gallery-bottom" />
    </div>
  );
}
