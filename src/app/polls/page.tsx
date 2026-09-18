import { getUiStrings } from "@/lib/i18n/server";
import { isPollClosed } from "@/lib/v4/engagement";
import { getV4Rows } from "@/lib/v4/queries";
import { PollCard } from "@/components/engagement/PollCard";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.polls };
}
export default async function Page() {
  const { v4: t, kn } = await getUiStrings();

  const polls = await getV4Rows("polls");
  return (
    <div className="container page-shell">
      <h1>{t.polls}</h1>
      <AdSlot placement="polls-top" />
      <div className="community-grid">
        {polls
          .filter((p) => p.status !== "draft")
          .map((p) => (
            <PollCard closed={isPollClosed(p)} poll={p} key={p.id} />
          ))}
      </div>
      {!polls.length && <p>{kn.noResults}</p>}
      <AdSlot placement="polls-bottom" />
    </div>
  );
}
