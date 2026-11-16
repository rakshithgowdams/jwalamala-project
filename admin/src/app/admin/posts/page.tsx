import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import type { Tri } from "@/lib/i18n/strings";
import { ExternalLink, Pencil } from "lucide-react";
import { site } from "@/config/site";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import { PostFilters } from "@/components/admin/PostFilters";
import { PostThumb } from "@/components/admin/PostThumb";
import { youtubeThumbnail } from "@/lib/utils/images";

/** Prefer the stored cover. If that is still the logo, use the YouTube video's thumbnail. */
function cardThumbnail(thumbnail: string | null, video: string | null) {
  const cover = (thumbnail || "").trim();
  const fromVideo = video ? youtubeThumbnail(video) : null;
  const logo = !cover || cover.includes("jwalamala-logo");
  if (logo && fromVideo) return fromVideo;
  // The list uses the smaller YouTube size so every card arrives in one request.
  return (cover || fromVideo || "/images/jwalamala-logo.jpg").replace(
    "/maxresdefault.jpg",
    "/hqdefault.jpg",
  );
}

const statusNames: Record<string, Tri> = {
  draft: { en: "Draft", kn: "ಕರಡು", hi: "ड्राफ़्ट" },
  scheduled: { en: "Scheduled", kn: "ನಿಗದಿತ", hi: "निर्धारित" },
  published: { en: "Published", kn: "ಪ್ರಕಟಿತ", hi: "प्रकाशित" },
  archived: { en: "Archived", kn: "ಸಂಗ್ರಹಿತ", hi: "संग्रहीत" },
};
const typeNames: Record<string, Tri> = {
  article: { en: "Article", kn: "ಲೇಖನ", hi: "लेख" },
  video: { en: "Video", kn: "ವಿಡಿಯೋ", hi: "वीडियो" },
  short: { en: "Short video", kn: "ಕಿರು ವಿಡಿಯೋ", hi: "छोटा वीडियो" },
};
type PostFiltersQuery = {
  page?: string;
  q?: string;
  status?: string;
  type?: string;
  sort?: string;
};

export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<PostFiltersQuery>;
}) {
  const filters = await searchParams;
  const { kn, tr } = await getUiStrings();
  return (
    <>
      <div className="list-sticky-head">
        <div className="section-title">
          <h1>{kn.posts}</h1>
          <div className="page-actions">
            <Link href="/admin/posts/bin" className="button button-outline">
              {tr({ en: "Recycle bin", kn: "ಮರುಬಳಕೆ ಡಬ್ಬಿ", hi: "रीसायकल बिन" })}
            </Link>
            <Link href="/admin/posts/new" className="button button-ember">
              {kn.newPost}
            </Link>
          </div>
        </div>
        <PostFilters q={filters.q} status={filters.status} type={filters.type} sort={filters.sort} />
      </div>
      <Suspense
        key={[filters.page, filters.q, filters.status, filters.type, filters.sort].join("|")}
        fallback={<PostGridFallback />}
      >
        <PostResults filters={filters} />
      </Suspense>
    </>
  );
}

async function PostResults({ filters }: { filters: PostFiltersQuery }) {
  const page = Math.max(1, Math.min(10000, Math.floor(Number(filters.page)) || 1));
  const [{ db, profile, user }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const canDelete = profile.role === "admin";
  const sort = ["updated", "oldest", "published", "title"].includes(filters.sort || "")
    ? filters.sort
    : "updated";
  const pageSize = 30;
  // Staff only browse articles assigned to them (join — never .in() thousands of UUIDs).
  const staffOnly = profile.role === "staff";
  let query = staffOnly
    ? db
        .from("posts")
        .select(
          "id,title_kn,slug,status,type,updated_at,published_at,thumbnail_url,video_url,article_tasks!inner(assignee_id,status)",
          { count: "exact" },
        )
        .eq("article_tasks.assignee_id", user.id)
        .eq("article_tasks.status", "open")
    : db.from("posts").select(
        "id,title_kn,slug,status,type,updated_at,published_at,thumbnail_url,video_url",
        { count: "exact" },
      );
  if (sort === "oldest") query = query.order("updated_at", { ascending: true });
  else if (sort === "title") query = query.order("title_kn", { ascending: true });
  else if (sort === "published") query = query.order("published_at", { ascending: false, nullsFirst: false });
  else query = query.order("updated_at", { ascending: false });
  // Archived articles are the recycle bin, listed on their own page.
  query = query.neq("status", "archived");
  if (filters.q)
    query = query.ilike(
      "title_kn",
      "%" + filters.q.slice(0, 200).replace(/[%_]/g, "") + "%",
    );
  if (["draft", "published", "scheduled"].includes(filters.status || ""))
    query = query.eq("status", filters.status!);
  if (["article", "video", "short"].includes(filters.type || ""))
    query = query.eq("type", filters.type!);
  // Prefer an exact staff assignment total so the pager can show 1 2 3 4 … last.
  let knownTotal: number | null = null;
  if (staffOnly && !filters.q && !filters.status && !filters.type) {
    const { count: taskCount } = await db
      .from("article_tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", user.id)
      .eq("status", "open");
    if (typeof taskCount === "number") knownTotal = taskCount;
  }
  const guessedPages =
    knownTotal != null ? Math.max(1, Math.ceil(knownTotal / pageSize)) : null;
  let safePage = guessedPages != null ? Math.min(page, guessedPages) : page;
  let from = (safePage - 1) * pageSize;
  let {
    data: posts,
    error,
    count,
  } = await query.range(from, from + pageSize - 1);
  if (error) {
    if (staffOnly && /article_tasks|relationship|embed|Bad Request/i.test(error.message || "")) {
      return (
        <p>
          {tr({
            en: "No articles are assigned to you yet, or Tasks is not set up. Ask an administrator to assign work on Tasks.",
            kn: "ನಿಮಗೆ ಇನ್ನೂ ಲೇಖನಗಳನ್ನು ನಿಯೋಜಿಸಿಲ್ಲ, ಅಥವಾ ಕಾರ್ಯಗಳು ಸಿದ್ಧವಿಲ್ಲ. ನಿರ್ವಾಹಕರನ್ನು ಕೇಳಿ.",
            hi: "अभी आपके नाम लेख नहीं हैं, या Tasks सेट नहीं है। एडमिन से असाइन करवाएँ।",
          })}
        </p>
      );
    }
    throw error;
  }
  const total = typeof count === "number" ? count : knownTotal || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (safePage > pages) {
    safePage = pages;
    from = (safePage - 1) * pageSize;
    const again = await query.range(from, from + pageSize - 1);
    if (!again.error) posts = again.data;
  }
  if (staffOnly && !(posts?.length || total)) {
    return (
      <p>
        {tr({
          en: "No articles are assigned to you yet. Open Tasks when an administrator gives you work.",
          kn: "ನಿಮಗೆ ಇನ್ನೂ ಲೇಖನಗಳನ್ನು ನಿಯೋಜಿಸಿಲ್ಲ. ನಿರ್ವಾಹಕರು ಕೆಲಸ ನೀಡಿದಾಗ ಕಾರ್ಯಗಳು ತೆರೆಯಿರಿ.",
          hi: "अभी आपके नाम कोई लेख नहीं है। एडमिन काम दें तो Tasks खोलें।",
        })}
      </p>
    );
  }
  const updatedOn = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return (
    <>
      <div className="post-card-list">
        {posts?.map((p, index) => (
          <article
            key={p.id}
            className={"post-card is-" + p.status}
            style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
          >
            <div className="post-card-thumb">
              <PostThumb src={cardThumbnail(p.thumbnail_url, p.video_url)} eager={index < 6} />
              <div className="post-card-badges">
                <span className={"status-pill is-" + p.status}>
                  {statusNames[p.status] ? tr(statusNames[p.status]) : p.status}
                </span>
                <span className="post-card-type">
                  {typeNames[p.type] ? tr(typeNames[p.type]) : p.type}
                </span>
              </div>
              <time className="post-card-updated" dateTime={p.updated_at}>
                {tr({ en: "Updated", kn: "ಬದಲಾವಣೆ", hi: "बदलाव" })} {updatedOn.format(new Date(p.updated_at))}
              </time>
            </div>
            <div className="post-card-body">
            <h2>
              <Link href={"/admin/posts/" + p.id} prefetch={false}>{p.title_kn}</Link>
            </h2>
            <div className="post-actions">
              <Link href={"/admin/posts/" + p.id} prefetch={false} className="button button-outline is-compact">
                <Pencil size={15} aria-hidden="true" />
                {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
              </Link>
              {p.status === "published" && (
                <a
                  href={`${site.url}/news/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-outline is-compact"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                </a>
              )}
              {canDelete && <DeletePostButton postId={p.id} title={p.title_kn} compact />}
            </div>
            </div>
          </article>
        ))}
        {!posts?.length && (
          <p className="post-card-empty">
            {tr({
              en: "No articles found. Change the filters or write a new article.",
              kn: "ಯಾವುದೇ ಲೇಖನ ಸಿಗಲಿಲ್ಲ. ಫಿಲ್ಟರ್ ಬದಲಿಸಿ ಅಥವಾ ಹೊಸ ಲೇಖನ ಬರೆಯಿರಿ.",
              hi: "कोई लेख नहीं मिला। फ़िल्टर बदलें या नया लेख लिखें।",
            })}
          </p>
        )}
      </div>
      <Pagination
        page={safePage}
        pages={pages}
        query={{ q: filters.q, status: filters.status, type: filters.type, sort: filters.sort }}
      />
    </>
  );
}

function PostGridFallback() {
  return (
    <div className="post-card-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="post-card post-card-skeleton" key={index}>
          <div className="skeleton-block skeleton-media" />
          <div className="skeleton-block skeleton-line" />
        </div>
      ))}
    </div>
  );
}
