import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { LiteVideoEmbed } from "@/components/news/LiteVideoEmbed";
import type { LiveUpdate } from "@/lib/v4/types";
export function LiveMedia({ media }: { media: LiveUpdate["media"] }) {
  if (!media) return null;
  if (media.type === "video")
    return (
      <>
        <LiteVideoEmbed
          url={media.url}
          thumbnail="/images/jwalamala-logo.jpg"
          title={media.credit}
        />
        <p className="meta">{media.credit}</p>
      </>
    );
  if (!(
    /^\/images\//.test(media.url) ||
    /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(
      media.url,
    )
  ))
    return null;
  return (
    <figure>
      <Image
        src={media.url}
        alt={media.credit}
        width={900}
        height={600}
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption>{media.credit}</figcaption>
    </figure>
  );
}
