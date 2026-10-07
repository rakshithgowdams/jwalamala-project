import { requirePermission } from "@/lib/v4/permissions";
import { HomeBuilder } from "@/components/admin/v4/HomeBuilder";
import { homeSchema, defaultHome } from "@/lib/v4/home";
export default async function Page() {
  const { db } = await requirePermission("content.edit");
  const [settings, posts, categories, galleries] = await Promise.all([
    db
      .from("site_settings")
      .select("value")
      .eq("key", "homepage")
      .maybeSingle(),
    db
      .from("posts")
      .select("id,title_kn")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200),
    db.from("categories").select("slug,name_kn").order("sort_order"),
    db
      .from("galleries")
      .select("id,title_kn")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (settings.error || posts.error || categories.error || galleries.error)
    throw Error("Unable to load homepage editor data");
  return (
    <>
      <h1>ಮುಖಪುಟ ವಿನ್ಯಾಸ</h1>
      <HomeBuilder
        initial={homeSchema
          .catch(defaultHome)
          .parse(settings.data?.value || defaultHome)}
        posts={posts.data || []}
        categories={categories.data || []}
        galleries={galleries.data || []}
      />
    </>
  );
}
