import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { kn, v4 as t } from "@/content/strings.kn";
export const metadata = {
  title: kn.admin,
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  return (
    <div className="container page-shell admin-layout">
      <nav className="admin-nav">
        {[
          ["", kn.dashboard],
          ["posts", kn.posts],
          ["categories", kn.categories],
          ["events", kn.events],
          ["ads", kn.advertise],
          ["ad-settings", t.adSlots],
          ["roles", t.roles],
          ["submissions", kn.submissions],
          ["users", kn.users],
          ["contributors", "Contributor applications"],
          ["settings", kn.settings],
          ["desk", t.desk],
          ["home", "ಮುಖಪುಟ ವಿನ್ಯಾಸ"],
          ["utility-import", "Utility CSV"],
          ["redirects", "301 redirects"],
          ["audit", "Audit history"],
          ["import", "CSV ಆಮದು"],
          ["trending", t.trendingTopics],
          ["topics", t.topics],
          ["tags", t.tags],
          ["places", t.places],
          ["authors", t.authors],
          ["series", t.series],
          ["live-blogs", t.liveblogs],
          ["jain-calendar", t.jainCalendar],
          ["jain-times", "Jain time rules"],
          ["basadis", t.basadis],
          ["notices", t.notices],
          ["notice-billing", "Paid notices"],
          ["opportunities", t.opportunities],
          ["moderation", t.moderation],
          ["comments", "ಅಭಿಪ್ರಾಯಗಳು"],
          ["polls", t.polls],
          ["quizzes", t.quizzes],
          ["galleries", t.gallery],
          ["web-stories", t.stories],
          ["providers", t.providers],
          ["weather", t.weather],
          ["jobs", t.jobs],
          ["analytics", t.analytics],
          ["social", t.social],
          ["newsletter", t.newsletter],
          ["distribution-schedule", "Bulletin schedule"],
          ["push", "ಅಧಿಸೂಚನೆಗಳು"],
          ["support", "ಬೆಂಬಲ ಮತ್ತು ಸದಸ್ಯತ್ವ"],
          ["reservoirs", t.reservoirs],
          ["rates", t.rates],
        ].map(([path, title]) => (
          <Link href={"/admin/" + path} key={path}>
            {title}
          </Link>
        ))}
      </nav>
      <section>{children}</section>
    </div>
  );
}
