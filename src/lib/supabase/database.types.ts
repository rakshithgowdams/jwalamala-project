/**
 * Hand-maintained slice of the public schema used by the news app.
 * Full output of `supabase gen types typescript` is not checked in; keep this
 * in step with supabase/migrations when columns or enums change.
 */
export type VideoProvider = "youtube" | "facebook" | "instagram" | "none";
export type SocialPlatform = "facebook" | "instagram";
export type ImageLayout = "single" | "split2" | "collage3" | "video";

export type PostsSocialColumns = {
  video_provider: VideoProvider;
  social_platform: SocialPlatform | null;
  social_post_url: string | null;
  social_post_id: string | null;
  image_layout: ImageLayout;
};
