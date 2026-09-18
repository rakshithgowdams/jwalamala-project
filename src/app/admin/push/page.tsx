import { requirePermission } from "@/lib/v4/permissions";
import { PushComposer } from "@/components/admin/v4/PushComposer";
export default async function Page() {
  const { db } = await requirePermission("content.publish");
  const [posts, campaigns] = await Promise.all([
    db
      .from("posts")
      .select("id,title_kn,summary_kn")
      .eq("status", "published")
      .eq("is_seed", false)
      .order("published_at", { ascending: false })
      .limit(100),
    db
      .from("push_campaigns")
      .select("id,title,topic,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return (
    <>
      <h1>ಅಧಿಸೂಚನೆಗಳು</h1>
      <p>
        ಅನುಮತಿ ನೀಡಿದ ಓದುಗರಿಗೆ ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ. ಶಾಂತ ಸಮಯ ಮತ್ತು ದಿನದ
        ಮಿತಿಯನ್ನು ಪಾಲಿಸಲಾಗುತ್ತದೆ.
      </p>
      <PushComposer posts={posts.data || []} />
      <h2>ಕಳುಹಿಸಲು ಅನುಮೋದಿಸಿದ ಅಧಿಸೂಚನೆಗಳು</h2>
      {campaigns.data?.map((c) => (
        <p key={c.id}>
          {c.title} · {c.topic} ·{" "}
          {new Date(c.created_at).toLocaleDateString("kn-IN")}
        </p>
      ))}
    </>
  );
}
