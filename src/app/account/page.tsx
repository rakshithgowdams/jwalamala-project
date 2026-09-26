import { CalendarReminder } from "@/components/engagement/CalendarReminder";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getCategories, getPosts, getEvents } from "@/lib/queries/content";
import { NewsCard } from "@/components/news/NewsCard";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/Primitives";
import { ProfileCard, Interests } from "@/components/auth/AccountControls";
import { PushSettings } from "@/components/pwa/PushSettings";
import {
  MessageSquare,
  Rss,
  History as HistoryIcon,
  Star,
  LifeBuoy,
  Lock,
  ChevronRight,
} from "lucide-react";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.account,
    robots: { index: false, follow: false },
  };
}
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const { db, user } = await requireUser();
  const { tab = "saved" } = await searchParams;
  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [posts, events, categories] = await Promise.all([
      getPosts(),
      getEvents(),
      getCategories(),
    ]);
  } catch {}
  const [{ data: bookmarks }, { data: reminders }, { data: profile }] =
    await Promise.all([
      db.from("bookmarks").select("post_id").eq("user_id", user.id),
      db.from("event_reminders").select("event_id").eq("user_id", user.id),
      db.from("profiles").select("*").eq("id", user.id).single(),
    ]);
  const { data: calendar } = await db
    .from("calendar_reminders")
    .select("day_id,jain_calendar_days(*)")
    .eq("user_id", user.id);
  const saved = posts.filter((p) => bookmarks?.some((b) => b.post_id === p.id));
  const { data: staffAccess } = await db.rpc("has_permission", {
    requested: "admin.access",
  });
  return (
    <div className="container page-shell">
      <div className="section-title">
        <h1>{kn.account}</h1>
      </div>
      <ProfileCard
        userId={user.id}
        fullName={profile?.full_name || ""}
        email={user.email || ""}
        phone={user.phone || ""}
      />
      {staffAccess === true && (
        <Link
          className="button button-outline"
          style={{ marginBottom: 24 }}
          href="/admin"
        >
          {kn.admin}
        </Link>
      )}
      <nav className="account-tabs" aria-label={kn.account}>
        {[
          ["saved", kn.savedPosts],
          ["reminders", kn.reminders],
          ["interests", kn.interests],
          ["notifications", kn.notifications],
        ].map(([v, label]) => (
          <Link
            key={v}
            className={tab === v ? "active" : ""}
            aria-current={tab === v ? "page" : undefined}
            href={"/account?tab=" + v}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "saved" &&
        (saved.length ? (
          <div className="news-grid">
            {saved.map((p) => (
              <NewsCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState title={kn.noSaved} />
        ))}
      {tab === "reminders" &&
        events
          .filter((e) => reminders?.some((r) => r.event_id === e.id))
          .map((e) => (
            <section key={e.id}>
              <EventCard event={e} />
              <CalendarReminder id={e.id} event />
            </section>
          ))}
      {tab === "reminders" &&
        calendar?.map((r) => {
          const day = Array.isArray(r.jain_calendar_days)
            ? r.jain_calendar_days[0]
            : r.jain_calendar_days;
          return (
            <section className="utility-panel" key={r.day_id}>
              <h2>
                {day &&
                  pickText(locale, day.title_kn, day.title_en, day.title_hi)}
              </h2>
              <p>{day?.date}</p>
              <CalendarReminder id={r.day_id} />
            </section>
          );
        })}
      {tab === "interests" && (
        <Interests
          userId={user.id}
          categories={categories}
          town={profile?.town || ""}
          selected={profile?.interests || []}
        />
      )}{" "}
      {tab === "notifications" && <PushSettings />}
      <section className="account-links">
        <h2>{t.more}</h2>
        <div className="account-links-list">
          <Link className="account-link-row" href="/account/contribute">
            <MessageSquare size={18} />
            {kn.citizenReporter}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
          <Link className="account-link-row" href="/account/feed">
            <Rss size={18} />
            {t.feed}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
          <Link className="account-link-row" href="/account/history">
            <HistoryIcon size={18} />
            {t.history}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
          <Link className="account-link-row" href="/account/early-access">
            <Star size={18} />
            {kn.earlyAccessShort}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
          <Link className="account-link-row" href="/account/support">
            <LifeBuoy size={18} />
            {kn.mySupport}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
          <Link className="account-link-row" href="/account/password">
            <Lock size={18} />
            {kn.newPassword}
            <ChevronRight size={16} className="account-link-chevron" />
          </Link>
        </div>
      </section>
    </div>
  );
}
