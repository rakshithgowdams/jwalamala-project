import { LocationFilter } from "@/components/search/LocationFilter";
import type { Filters } from "@/lib/utils/search";
import { getListing } from "@/lib/queries/listing";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, getCategories } from "@/lib/queries/content";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn, locale } = await getUiStrings();
  const { slug } = await params;
  const c = (await getCategories()).find((c) => c.slug === slug);
  return {
    title: c ? pickText(locale, c.name_kn, c.name_en) : kn.notFound,
    alternates: { canonical: "/category/" + slug },
  };
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Filters & { page?: string }>;
}) {
  const { kn, locale } = await getUiStrings();

  const { slug } = await params;
  const f = await searchParams;
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const listing = await getListing({ ...f, category: slug }, f.page, 9);
  const page = listing.page,
    visible = listing.rows;
  return (
    <div className="container page-shell">
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {pickText(locale, category.name_kn, category.name_en)}
      </div>
      <div className="page-heading">
        <h1>{pickText(locale, category.name_kn, category.name_en)}</h1>
      </div>
      <AdSlot placement={`category-${slug}-top`} />
      <div className="ad-supported-layout">
        <div className="ad-supported-content">
          <LocationFilter filters={f} action={"/category/" + slug} />
          <form className="filters filter-row">
            {["state", "district", "city"].map((key) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={f[key as keyof typeof f] || ""}
              />
            ))}
            <label className="field">
              {kn.year}
              <select name="year" defaultValue={f.year || ""}>
                <option value="">{kn.all}</option>
                {[...new Set(posts.map((p) => p.event_date.slice(0, 4)))].map(
                  (y) => (
                    <option key={y}>{y}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              {kn.sort}
              <select name="sort" defaultValue={f.sort || "newest"}>
                <option value="newest">{kn.newest}</option>
                <option value="oldest">{kn.oldest}</option>
              </select>
            </label>
            <button className="button button-ember">{kn.filter}</button>
          </form>
          {visible.length ? (
            <div className="news-grid">
              {visible.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          <nav className="pagination">
            {Array.from(
              { length: Math.min(listing.pages, 7) },
              (_, index) =>
                index + Math.max(0, Math.min(page - 4, listing.pages - 7)),
            ).map((i) => (
              <Link
                aria-current={page === i + 1 ? "page" : undefined}
                className={"chip " + (page === i + 1 ? "active" : "")}
                key={i}
                href={"?" + new URLSearchParams({ ...f, page: String(i + 1) })}
              >
                {i + 1}
              </Link>
            ))}
          </nav>
        </div>
        <aside className="ad-sidebar" aria-label={kn.advertisement}>
          <AdSlot placement={`category-${slug}-sidebar`} format="rectangle" />
        </aside>
      </div>
      <AdSlot placement={`category-${slug}-bottom`} />
    </div>
  );
}
