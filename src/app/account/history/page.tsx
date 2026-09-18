import { ReaderHistory } from "@/components/engagement/ReaderHistory";
import { getUiStrings } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return {
    title: t.history,
    robots: { index: false, follow: false },
  };
}
export default async function Page() {
  const { v4: t } = await getUiStrings();
  return (
    <div className="container page-shell">
      <h1>{t.history}</h1>
      <ReaderHistory />
    </div>
  );
}
