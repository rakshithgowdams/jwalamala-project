import { getUiStrings } from "@/lib/i18n/server";
import { DownloadsList } from "@/components/pwa/DownloadsList";

export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return { title: kn.downloadsTitle, robots: { index: false, follow: false } };
}

export default async function Downloads() {
  const { kn } = await getUiStrings();
  return (
    <div className="container page-shell text-page">
      <div className="page-heading">
        <h1>{kn.downloadsTitle}</h1>
        <p>{kn.downloadsIntro}</p>
      </div>
      <DownloadsList />
    </div>
  );
}
