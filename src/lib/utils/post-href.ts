import type { Post } from "@/lib/types";
export const postHref = (p: Pick<Post, "type" | "slug">) =>
  "/" + (p.type === "article" ? "news" : "video") + "/" + p.slug;
