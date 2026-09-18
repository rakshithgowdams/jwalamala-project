import { WifiOff } from "lucide-react";
import Link from "next/link";
import { kn } from "@/content/strings.kn";
export const metadata = { title: kn.offline };
export default function Offline() {
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
