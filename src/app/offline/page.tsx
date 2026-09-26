import { WifiOff } from "lucide-react";
import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return { title: kn.offline };
}
// The service worker precaches this route, so the copy a reader sees offline is
// the one that was current when the worker installed, not their latest switch.
export default async function Offline() {
  const { kn } = await getUiStrings();
  return (
    <div className="container page-shell">
      <div className="empty-state">
        <WifiOff size={48} />
        <h1>{kn.offline}</h1>
        <p>{kn.offlineDescription}</p>
        <Link className="button button-ember" href="/">
          {kn.retry}
        </Link>
      </div>
    </div>
  );
}
