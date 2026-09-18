import { getServerClient } from "@/lib/supabase/server";
import { ListenButton } from "./AudioPlayer";
import { site } from "@/config/site";
export async function ArticleAudio({
  postId,
  title,
  href,
}: {
  postId: string;
  title: string;
  href: string;
}) {
  if (site.demo) return null;
  const db = await getServerClient();
  if (!db) return null;
  const { data } = await db
    .from("post_audio")
    .select("audio_url")
    .eq("post_id", postId)
    .eq("status", "ready")
    .maybeSingle();
  if (!data?.audio_url) return null;
  return <ListenButton url={data.audio_url} title={title} href={href} />;
}
