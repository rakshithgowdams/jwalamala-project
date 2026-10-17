import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import { RestorePostButton } from "@/components/admin/RestorePostButton";
import { PostThumb } from "@/components/admin/PostThumb";
import { youtubeThumbnail } from "@/lib/utils/images";

function cardThumbnail(thumbnail: string | null, video: string | null) {
  const cover = (thumbnail || "").trim();
  const fromVideo = video ? youtubeThumbnail(video) : null;
  const logo = !cover || cover.includes("jwalamala-logo");
  const src = logo && fromVideo ? fromVideo : cover || fromVideo || "/images/jwalamala-logo.jpg";
  return src.replace("/maxresdefault.jpg", "/hqdefault.jpg");
}

export default async function RecycleBin() {
  const [{ db, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const canDelete = profile.role === "admin";
  const { data: posts, error } = await db
    .from("posts")
    .select("id,title_kn,status,type,deleted_at,thumbnail_url,video_url")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const removedOn = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Recycle bin", kn: "ಮರುಬಳಕೆ ಡಬ್ಬಿ", hi: "रीसायकल बिन" })}</h1>
        <Link href="/admin/posts" className="button button-outline">
          {tr({ en: "Back to articles", kn: "ಲೇಖನಗಳಿಗೆ ಹಿಂದಿರುಗಿ", hi: "लेखों पर वापस" })}
        </Link>
      </div>
      <p className="recycle-note">
        {tr({
          en: "Articles here are off the site. Restore puts one back. Delete asks before it is removed forever.",
          kn: "ಇಲ್ಲಿರುವ ಲೇಖನಗಳು ಸೈಟ್‌ನಲ್ಲಿ ಕಾಣಿಸುವುದಿಲ್ಲ. ಮರಳಿಸಿ ಎಂದರೆ ಮತ್ತೆ ಪಟ್ಟಿಗೆ ಬರುತ್ತದೆ. ಅಳಿಸಿ ಎಂದರೆ ಶಾಶ್ವತವಾಗಿ ತೆಗೆಯುವ ಮೊದಲು ಕೇಳುತ್ತದೆ.",
          hi: "यहाँ के लेख साइट पर नहीं दिखते। वापस लाएँ उन्हें सूची में लौटाता है। हटाएँ हमेशा के लिए मिटाने से पहले पूछता है।",
        })}
      </p>
      <div className="post-card-list">
        {posts?.map((post, index) => (
          <article key={post.id} className="post-card is-archived">
            <div className="post-card-thumb">
              <PostThumb src={cardThumbnail(post.thumbnail_url, post.video_url)} eager={index < 6} />
              <time className="post-card-updated" dateTime={post.deleted_at || undefined}>
                {tr({ en: "Removed", kn: "ತೆಗೆದದ್ದು", hi: "हटाया गया" })}{" "}
                {post.deleted_at ? removedOn.format(new Date(post.deleted_at)) : ""}
              </time>
            </div>
            <div className="post-card-body">
              <h2>
                <Link href={"/admin/posts/" + post.id}>{post.title_kn}</Link>
              </h2>
              {canDelete ? (
                <div className="post-actions">
                  <RestorePostButton postId={post.id} title={post.title_kn} />
                  <DeletePostButton postId={post.id} title={post.title_kn} mode="forever" compact />
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {!posts?.length && (
          <p className="post-card-empty">
            {tr({
              en: "The recycle bin is empty.",
              kn: "ಮರುಬಳಕೆ ಡಬ್ಬಿ ಖಾಲಿಯಾಗಿದೆ.",
              hi: "रीसायकल बिन खाली है।",
            })}
          </p>
        )}
      </div>
    </>
  );
}
