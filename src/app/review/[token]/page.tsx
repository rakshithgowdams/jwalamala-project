import Image from "next/image";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { digest } from "@/lib/v4/server";
import { cleanHtml } from "@/lib/utils/sanitize";
import { ApproveSponsor } from "@/components/engagement/ApproveSponsor";
export const metadata = {
  robots: { index: false, follow: false },
  title: "ಪ್ರಾಯೋಜಿತ ವಿಷಯ ಪರಿಶೀಲನೆ",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const db = getAdminClient();
  if (!db) notFound();
  const { data: review } = await db
    .from("sponsor_reviews")
    .select("post_id,approved_at,content_hash")
    .eq("token_hash", digest(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!review) notFound();
  const { data: post } = await db
    .from("posts")
    .select("*")
    .eq("id", review.post_id)
    .single();
  if (!post) notFound();
  const { data: hash } = await db.rpc("sponsor_content_hash", { p: post });
  const current = hash === review.content_hash;
  return (
    <div className="container page-shell">
      <p className="notice">ಖಾಸಗಿ ಪರಿಶೀಲನೆ · ಪ್ರಾಯೋಜಕರು: {post.sponsor_name}</p>
      <h1>{post.title_kn}</h1>
      <p>{post.summary_kn}</p>
      {post.video_url && (
        <a href={post.video_url} target="_blank" rel="noopener noreferrer">
          Review linked video
        </a>
      )}
      <figure>
        <Image
          unoptimized
          width={1200}
          height={800}
          src={post.thumbnail_url}
          alt=""
          style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }}
        />
      </figure>
      {(post.media_images || []).map(
        (item: { url: string; credit: string }) => (
          <figure key={item.url}>
            <Image
              unoptimized
              width={1200}
              height={800}
              src={item.url}
              alt=""
              style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }}
            />
            <figcaption>{item.credit}</figcaption>
          </figure>
        ),
      )}
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: cleanHtml(post.body_html) }}
      />
      {post.transcript && (
        <details>
          <summary>Transcript</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{post.transcript}</p>
        </details>
      )}
      {post.body_en && (
        <section lang="en">
          <h2>{post.title_en}</h2>
          <p>{post.summary_en}</p>
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: cleanHtml(post.body_en) }}
          />
        </section>
      )}
      {current ? (
        <ApproveSponsor token={token} approved={!!review.approved_at} />
      ) : (
        <p role="status">
          ವಿಷಯ ಬದಲಾಗಿದೆ. ಸಂಪಾದಕರಿಂದ ಹೊಸ ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಪಡೆಯಿರಿ.
        </p>
      )}
    </div>
  );
}
