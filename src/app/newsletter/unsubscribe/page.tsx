import { getUiStrings } from "@/lib/i18n/server";
import { NewsletterConfirm } from "@/components/engagement/NewsletterConfirm";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return {
    title: t.unsubscribe,
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const,
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { v4: t } = await getUiStrings();

  const { token = "" } = await searchParams;
  return (
    <div className="container page-shell narrow">
      <h1>{t.unsubscribe}</h1>
      <NewsletterConfirm token={token} mode="unsubscribe" />
    </div>
  );
}
