import { getUiStrings } from "@/lib/i18n/server";
import { getFeedData } from "@/lib/v4/feed";
import { MyFeed } from "@/components/engagement/MyFeed";
import { requireUser } from "@/lib/auth/require-user";
export default async function Page() {
  await requireUser("/account/feed");
  const { v4: t } = await getUiStrings();
  const data = await getFeedData();
  return (
    <div className="container page-shell">
      <h1>{t.feed}</h1>
      <MyFeed {...data} />
    </div>
  );
}
