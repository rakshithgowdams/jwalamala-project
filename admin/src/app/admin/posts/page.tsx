import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import type { Tri } from "@/lib/i18n/strings";
import { ExternalLink, Pencil } from "lucide-react";
import { site } from "@/config/site";
import { DeletePostButton } from "@/components/admin/DeletePostButton";

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
export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const filters = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(filters.page)) || 1),
  );
  const [{ db, profile }, { kn, tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const canDelete = profile.role === "admin";
  const all = tr({ en: "All", kn: "ಎಲ್ಲಾ", hi: "सभी" });
  let query = db
    .from("posts")
    .select("id,title_kn,slug,status,type,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false });
  if (filters.q)
    query = query.ilike(
      "title_kn",
      "%" + filters.q.slice(0, 200).replace(/[%_]/g, "") + "%",
    );
  if (
    ["draft", "published", "scheduled", "archived"].includes(
      filters.status || "",
    )
  )
    query = query.eq("status", filters.status!);
  if (["article", "video", "short"].includes(filters.type || ""))
    query = query.eq("type", filters.type!);
  const {
    data: posts,
    error,
    count,
  } = await query.range((page - 1) * 30, page * 30 - 1);
  if (error) throw error;
  return (
    <>
      <div className="section-title">
        <h1>{kn.posts}</h1>
        <Link href="/admin/posts/new" className="button button-ember">
          {kn.newPost}
        </Link>
      </div>
      <form className="filter-bar" method="get">
        <label className="field">
          {tr({ en: "Search", kn: "ಹುಡುಕಿ", hi: "खोजें" })}
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={tr({ en: "Search by title", kn: "ಶೀರ್ಷಿಕೆಯಿಂದ ಹುಡುಕಿ", hi: "शीर्षक से खोजें" })}
          />
        </label>
        <label className="field">
          {kn.status}
          <select name="status" defaultValue={filters.status}>
            <option value="">{all}</option>
            {Object.entries(statusNames).map(([value, label]) => (
              <option key={value} value={value}>
                {tr(label)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {tr({ en: "Type", kn: "ಪ್ರಕಾರ", hi: "प्रकार" })}
          <select name="type" defaultValue={filters.type}>
            <option value="">{all}</option>
            {Object.entries(typeNames).map(([value, label]) => (
              <option key={value} value={value}>
                {tr(label)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">
          {tr({ en: "Filter", kn: "ಫಿಲ್ಟರ್", hi: "फ़िल्टर" })}
        </button>
      </form>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{kn.title}</th>
              <th>{kn.status}</th>
              <th>{tr({ en: "Type", kn: "ಪ್ರಕಾರ", hi: "प्रकार" })}</th>
              <th>{tr({ en: "Last updated", kn: "ಕೊನೆಯ ಬದಲಾವಣೆ", hi: "अंतिम बदलाव" })}</th>
              <th className="post-actions-head">{tr({ en: "Actions", kn: "ಕ್ರಿಯೆಗಳು", hi: "कार्रवाई" })}</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={"/admin/posts/" + p.id}>{p.title_kn}</Link>
                </td>
                <td>
                  <span className={"status-pill is-" + p.status}>
                    {statusNames[p.status] ? tr(statusNames[p.status]) : p.status}
                  </span>
                </td>
                <td>{typeNames[p.type] ? tr(typeNames[p.type]) : p.type}</td>
                <td>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(p.updated_at))}
                </td>
                <td>
                  <div className="post-actions">
                    <Link href={"/admin/posts/" + p.id} className="button button-outline is-compact">
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
                </td>
              </tr>
            ))}
            {!posts?.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  {tr({
                    en: "No articles found. Change the filters or write a new article.",
                    kn: "ಯಾವುದೇ ಲೇಖನ ಸಿಗಲಿಲ್ಲ. ಫಿಲ್ಟರ್ ಬದಲಿಸಿ ಅಥವಾ ಹೊಸ ಲೇಖನ ಬರೆಯಿರಿ.",
                    hi: "कोई लेख नहीं मिला। फ़िल्टर बदलें या नया लेख लिखें।",
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={Math.ceil((count || 0) / 30)}
        query={{ q: filters.q, status: filters.status, type: filters.type }}
      />
    </>
  );
}
