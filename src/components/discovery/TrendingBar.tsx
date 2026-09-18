import { getUiStrings } from "@/lib/i18n/server";
import Link from "next/link";
import { Zap } from "lucide-react";

import { getV4Rows } from "@/lib/v4/queries";
import { activeTrending, safePublicLink } from "@/lib/v4/utils";
export async function TrendingBar() {
  const { v4: t } = await getUiStrings();

  const items = activeTrending(await getV4Rows("trending_items"));
  if (!items.length) return null;
  return (
    <div className="trending-bar">
      <nav className="container trending-scroll" aria-label={t.trendingTopics}>
        <span className="trending-label">
          <Zap size={16} />
          {t.trendingTopics}
        </span>
        {items.map((item) => (
          <Link
            key={item.id}
            href={safePublicLink(item.url)!}
            className={item.is_highlight ? "highlight" : ""}
          >
            {item.type === "live" && <span className="status-dot" />}
            {item.label_kn}
          </Link>
        ))}
      </nav>
    </div>
  );
}
