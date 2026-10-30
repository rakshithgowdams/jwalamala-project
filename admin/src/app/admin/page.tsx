import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  Headphones,
  Image as ImageIcon,
  LayoutTemplate,
  Megaphone,
  MousePointerClick,
  PlayCircle,
  Send,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { requireStaff } from "@/lib/auth/require-user";
import { loadDashboard, parseRange, RANGES, sampleDashboard } from "@/lib/admin/dashboard";
import {
  AnimatedNumber,
  AreaChart,
  BarList,
  ComboChart,
  DeltaBadge,
  DonutChart,
  FunnelBars,
  Sparkline,
} from "@/components/admin/DashboardCharts";
import { formatValue } from "@/lib/admin/format";
import { getUiStrings } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils/dates";
import type { Tri } from "@/lib/i18n/strings";
import { site } from "@/config/site";

const statusNames: Record<string, Tri> = {
  published: { en: "Published", kn: "ಪ್ರಕಟಿತ", hi: "प्रकाशित" },
  draft: { en: "Draft", kn: "ಕರಡು", hi: "ड्राफ़्ट" },
  scheduled: { en: "Scheduled", kn: "ನಿಗದಿತ", hi: "निर्धारित" },
  archived: { en: "Archived", kn: "ಸಂಗ್ರಹಿತ", hi: "संग्रहीत" },
};
const sourceNames: Record<string, Tri> = {
  whatsapp: { en: "WhatsApp", kn: "ವಾಟ್ಸ್‌ಆ್ಯಪ್", hi: "व्हाट्सऐप" },
  search: { en: "Search", kn: "ಹುಡುಕಾಟ", hi: "सर्च" },
  direct: { en: "Direct", kn: "ನೇರ", hi: "सीधे" },
  facebook: { en: "Facebook", kn: "ಫೇಸ್‌ಬುಕ್", hi: "फ़ेसबुक" },
  social: { en: "Social", kn: "ಸಾಮಾಜಿಕ", hi: "सोशल" },
  push: { en: "Push alerts", kn: "ಅಧಿಸೂಚನೆ", hi: "पुश सूचना" },
  newsletter: { en: "Newsletter", kn: "ಸುದ್ದಿ ಸಂಚಿಕೆ", hi: "न्यूज़लेटर" },
  telegram: { en: "Telegram", kn: "ಟೆಲಿಗ್ರಾಂ", hi: "टेलीग्राम" },
  other: { en: "Other", kn: "ಇತರೆ", hi: "अन्य" },
};
const deviceNames: Record<string, Tri> = {
  mobile: { en: "Mobile", kn: "ಮೊಬೈಲ್", hi: "मोबाइल" },
  desktop: { en: "Desktop", kn: "ಡೆಸ್ಕ್‌ಟಾಪ್", hi: "डेस्कटॉप" },
  tablet: { en: "Tablet", kn: "ಟ್ಯಾಬ್ಲೆಟ್", hi: "टैबलेट" },
};
const actionNames: Record<string, Tri> = {
  INSERT: { en: "created", kn: "ಸೇರಿಸಿದರು", hi: "बनाया" },
  UPDATE: { en: "updated", kn: "ನವೀಕರಿಸಿದರು", hi: "अपडेट किया" },
  DELETE: { en: "deleted", kn: "ಅಳಿಸಿದರು", hi: "हटाया" },
};
const tableNames: Record<string, Tri> = {
  posts: { en: "an article", kn: "ಲೇಖನ", hi: "एक लेख" },
  events: { en: "an event", kn: "ಕಾರ್ಯಕ್ರಮ", hi: "एक कार्यक्रम" },
  ads: { en: "an ad", kn: "ಜಾಹೀರಾತು", hi: "एक विज्ञापन" },
  post_comments: { en: "a comment", kn: "ಅಭಿಪ್ರಾಯ", hi: "एक टिप्पणी" },
  categories: { en: "a category", kn: "ವರ್ಗ", hi: "एक श्रेणी" },
  places: { en: "a place", kn: "ಊರು", hi: "एक स्थान" },
  site_settings: { en: "site settings", kn: "ತಾಣದ ಸೆಟ್ಟಿಂಗ್ಸ್", hi: "साइट सेटिंग्स" },
  profiles: { en: "a user", kn: "ಬಳಕೆದಾರ", hi: "एक उपयोगकर्ता" },
};
const quickActions: { href: string; label: Tri; icon: typeof FilePlus2 }[] = [
  { href: "/admin/posts/new", label: { en: "New article", kn: "ಹೊಸ ಲೇಖನ", hi: "नया लेख" }, icon: FilePlus2 },
  { href: "/admin/events", label: { en: "Add event", kn: "ಕಾರ್ಯಕ್ರಮ ಸೇರಿಸಿ", hi: "कार्यक्रम जोड़ें" }, icon: CalendarPlus },
  { href: "/admin/home", label: { en: "Home layout", kn: "ಮುಖಪುಟ ವಿನ್ಯಾಸ", hi: "होम लेआउट" }, icon: LayoutTemplate },
  { href: "/admin/posters", label: { en: "Poster ads", kn: "ಪೋಸ್ಟರ್ ಜಾಹೀರಾತು", hi: "पोस्टर विज्ञापन" }, icon: ImageIcon },
  { href: "/admin/push", label: { en: "Send notification", kn: "ಅಧಿಸೂಚನೆ ಕಳುಹಿಸಿ", hi: "सूचना भेजें" }, icon: Send },
  { href: "/admin/social", label: { en: "Share to social", kn: "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮಕ್ಕೆ ಹಂಚಿ", hi: "सोशल पर साझा करें" }, icon: Megaphone },
];

const name = (map: Record<string, Tri>, key: string, tr: (t: Tri) => string) =>
  map[key] ? tr(map[key]) : key.charAt(0).toUpperCase() + key.slice(1);

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; preview?: string }>;
}) {
  const { db, profile, user } = await requireStaff();
  const { tr, locale } = await getUiStrings();
  const params = await searchParams;
  const range = parseRange(params.range);
  const sample = params.preview === "sample";
  const data = sample ? sampleDashboard(range) : await loadDashboard(db, range);
  const greetingName = (profile.full_name as string | null)?.trim() || user.email || "";
  const pendingSetup = data.setup.filter((step) => !step.done);
  const query = (next: { range?: number; preview?: boolean }) => {
    const search = new URLSearchParams();
    const r = next.range ?? range;
    if (r !== 30) search.set("range", String(r));
    if (next.preview ?? sample) search.set("preview", "sample");
    const text = search.toString();
    return "/admin" + (text ? "?" + text : "");
  };
  const rangeLabel = tr({ en: `Last ${range} days`, kn: `ಕೊನೆಯ ${range} ದಿನ`, hi: `पिछले ${range} दिन` });
  const vsPrevious = tr({ en: "vs previous period", kn: "ಹಿಂದಿನ ಅವಧಿಗೆ ಹೋಲಿಸಿದರೆ", hi: "पिछली अवधि की तुलना में" });
  const views = tr({ en: "views", kn: "ವೀಕ್ಷಣೆಗಳು", hi: "व्यूज़" });
  const noTraffic = tr({
    en: "No reader traffic yet. This fills in as readers open articles on the news site.",
    kn: "ಇನ್ನೂ ಓದುಗರ ಭೇಟಿ ಇಲ್ಲ. ಓದುಗರು ಸುದ್ದಿ ತಾಣದಲ್ಲಿ ಲೇಖನ ತೆರೆದಂತೆ ಇದು ತುಂಬುತ್ತದೆ.",
    hi: "अभी पाठक नहीं आए। पाठक न्यूज़ साइट पर लेख खोलेंगे तो यह भरेगा।",
  });
  const ctr = data.ads.impressions ? (data.ads.clicks / data.ads.impressions) * 100 : 0;
  const card = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <div className="dash">
      {sample && (
        <div className="dash-sample" role="status">
          <Sparkles size={16} aria-hidden="true" />
          {tr({
            en: "Sample data preview — these numbers are not real.",
            kn: "ಮಾದರಿ ದತ್ತಾಂಶದ ಮುನ್ನೋಟ — ಈ ಅಂಕಿಗಳು ನೈಜವಲ್ಲ.",
            hi: "नमूना डेटा पूर्वावलोकन — ये आँकड़े असली नहीं हैं।",
          })}
          <Link href={query({ preview: false })}>
            {tr({ en: "Show real data", kn: "ನೈಜ ದತ್ತಾಂಶ ತೋರಿಸಿ", hi: "असली डेटा दिखाएँ" })}
          </Link>
        </div>
      )}

      <section className="dash-hero" style={card(0)}>
        <div>
          <p className="dash-eyebrow">
            {site.englishName} · {formatDate(data.today, false, locale)}
          </p>
          <h1>
            {tr({ en: "Welcome back", kn: "ಮತ್ತೆ ಸ್ವಾಗತ", hi: "फिर से स्वागत है" })}
            {greetingName ? `, ${greetingName}` : ""}
          </h1>
          <p>
            {tr({
              en: `Here is how ${site.englishName} is doing over the ${rangeLabel.toLowerCase()}.`,
              kn: `${rangeLabel}ಲ್ಲಿ ನಿಮ್ಮ ಸುದ್ದಿ ತಾಣದ ಸಾಧನೆ ಇಲ್ಲಿದೆ.`,
              hi: `${rangeLabel.toLowerCase()} में आपकी न्यूज़ साइट का प्रदर्शन यह रहा।`,
            })}
          </p>
        </div>
        <div className="dash-hero-side">
          <nav className="dash-range" aria-label={tr({ en: "Date range", kn: "ದಿನಾಂಕ ಅವಧಿ", hi: "तारीख़ अवधि" })}>
            {RANGES.map((r) => (
              <Link key={r} href={query({ range: r })} aria-current={r === range ? "true" : undefined}>
                {tr({ en: `${r} days`, kn: `${r} ದಿನ`, hi: `${r} दिन` })}
              </Link>
            ))}
          </nav>
          <div className="dash-hero-actions">
            <Link href="/admin/posts/new" className="button button-ember">
              <FilePlus2 size={16} aria-hidden="true" />
              {tr({ en: "New article", kn: "ಹೊಸ ಲೇಖನ", hi: "नया लेख" })}
            </Link>
            {!sample && (
              <Link href={query({ preview: true })} className="button dash-hero-secondary">
                <Sparkles size={16} aria-hidden="true" />
                {tr({ en: "Preview with sample data", kn: "ಮಾದರಿ ದತ್ತಾಂಶದೊಂದಿಗೆ ನೋಡಿ", hi: "नमूना डेटा के साथ देखें" })}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="dash-kpis">
        <article className="dash-kpi" style={card(1)}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-icon is-1"><Eye size={18} aria-hidden="true" /></span>
            {tr({ en: "Page views", kn: "ಪುಟ ವೀಕ್ಷಣೆಗಳು", hi: "पेज व्यूज़" })}
          </div>
          <strong><AnimatedNumber value={data.views.total} format="compact" locale={locale} /></strong>
          <div className="dash-kpi-foot">
            <DeltaBadge current={data.views.total} previous={data.views.previous} label={vsPrevious} />
            <span>{vsPrevious}</span>
          </div>
          <span className="dash-kpi-spark is-1"><Sparkline values={data.views.daily.map((d) => d.value)} /></span>
        </article>
        <article className="dash-kpi" style={card(2)}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-icon is-4"><Clock3 size={18} aria-hidden="true" /></span>
            {tr({ en: "Avg. reading time", kn: "ಸರಾಸರಿ ಓದುವ ಸಮಯ", hi: "औसत पढ़ने का समय" })}
          </div>
          <strong><AnimatedNumber value={data.engaged.averageSeconds} format="duration" locale={locale} /></strong>
          <div className="dash-kpi-foot">
            <DeltaBadge current={data.engaged.averageSeconds} previous={data.engaged.previousAverage} label={vsPrevious} />
            <span>{tr({ en: "minutes per view", kn: "ಪ್ರತಿ ವೀಕ್ಷಣೆಗೆ ನಿಮಿಷ", hi: "मिनट प्रति व्यू" })}</span>
          </div>
        </article>
        <article className="dash-kpi" style={card(3)}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-icon is-2"><FileText size={18} aria-hidden="true" /></span>
            {tr({ en: "Published articles", kn: "ಪ್ರಕಟಿತ ಲೇಖನಗಳು", hi: "प्रकाशित लेख" })}
          </div>
          <strong><AnimatedNumber value={data.published.total} locale={locale} /></strong>
          <div className="dash-kpi-foot">
            <span className="dash-delta is-up">+{formatValue(data.published.inRange || 0, "number", locale)}</span>
            <span>{tr({ en: "new in this period", kn: "ಈ ಅವಧಿಯಲ್ಲಿ ಹೊಸದು", hi: "इस अवधि में नए" })}</span>
          </div>
        </article>
        <article className="dash-kpi" style={card(4)}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-icon is-3"><Users size={18} aria-hidden="true" /></span>
            {tr({ en: "Registered readers", kn: "ನೋಂದಾಯಿತ ಓದುಗರು", hi: "पंजीकृत पाठक" })}
          </div>
          <strong><AnimatedNumber value={data.readers.total} locale={locale} /></strong>
          <div className="dash-kpi-foot">
            <span className="dash-delta is-up">+{formatValue(data.readers.inRange || 0, "number", locale)}</span>
            <span>{tr({ en: "joined in this period", kn: "ಈ ಅವಧಿಯಲ್ಲಿ ಸೇರಿದವರು", hi: "इस अवधि में जुड़े" })}</span>
          </div>
        </article>
      </div>

      <div className="dash-mini" style={card(5)}>
        {[
          { label: { en: "Drafts", kn: "ಕರಡುಗಳು", hi: "ड्राफ़्ट" }, value: data.counts.drafts, href: "/admin/posts" },
          { label: { en: "Scheduled", kn: "ನಿಗದಿತ", hi: "निर्धारित" }, value: data.counts.scheduled, href: "/admin/posts" },
          { label: { en: "Waiting for review", kn: "ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ", hi: "समीक्षा के लिए लंबित" }, value: data.counts.toReview, href: "/admin/moderation" },
          { label: { en: "Upcoming events", kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು", hi: "आगामी कार्यक्रम" }, value: data.counts.upcomingEvents, href: "/admin/events" },
          { label: { en: "Active ads", kn: "ಸಕ್ರಿಯ ಜಾಹೀರಾತುಗಳು", hi: "सक्रिय विज्ञापन" }, value: data.counts.activeAds, href: "/admin/posters" },
          { label: { en: "Places", kn: "ಊರುಗಳು", hi: "स्थान" }, value: data.counts.places, href: "/admin/places" },
        ].map((item) => (
          <Link href={item.href} key={item.label.en}>
            <strong>{item.value === null ? "—" : formatValue(item.value, "number", locale)}</strong>
            <span>{tr(item.label)}</span>
          </Link>
        ))}
      </div>

      {pendingSetup.length > 0 && (
        <details className="dash-card dash-setup" open style={card(6)}>
          <summary className="dash-card-head">
            <h2>{tr({ en: "Get the site ready", kn: "ತಾಣವನ್ನು ಸಿದ್ಧಪಡಿಸಿ", hi: "साइट तैयार करें" })}</h2>
            <span className="dash-progress" aria-hidden="true">
              <span style={{ width: `${((data.setup.length - pendingSetup.length) / data.setup.length) * 100}%` }} />
            </span>
            <span>
              {tr({
                en: `${data.setup.length - pendingSetup.length} of ${data.setup.length} done`,
                kn: `${data.setup.length} ರಲ್ಲಿ ${data.setup.length - pendingSetup.length} ಪೂರ್ಣ`,
                hi: `${data.setup.length} में से ${data.setup.length - pendingSetup.length} पूरे`,
              })}
            </span>
          </summary>
          <ol>
            {data.setup.map((step) => (
              <li key={step.href} className={step.done ? "done" : ""}>
                {step.done ? (
                  <CheckCircle2 size={20} aria-label={tr({ en: "Done", kn: "ಪೂರ್ಣ", hi: "पूरा" })} />
                ) : (
                  <Circle size={20} aria-label={tr({ en: "To do", kn: "ಬಾಕಿ", hi: "बाकी" })} />
                )}
                <div>
                  <Link href={step.href}>{tr(step.title)}</Link>
                  <p>{tr(step.detail)}</p>
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="dash-layout">
        <section className="dash-card span-8" style={card(7)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Audience overview", kn: "ಓದುಗರ ಅವಲೋಕನ", hi: "दर्शक अवलोकन" })}</h2>
              <p>{tr({ en: "Daily page views", kn: "ದೈನಂದಿನ ಪುಟ ವೀಕ್ಷಣೆಗಳು", hi: "दैनिक पेज व्यूज़" })} · {rangeLabel}</p>
            </div>
            <DeltaBadge current={data.views.total} previous={data.views.previous} label={vsPrevious} />
          </div>
          <AreaChart
            points={data.views.daily}
            currentLabel={tr({ en: "This period", kn: "ಈ ಅವಧಿ", hi: "यह अवधि" })}
            previousLabel={tr({ en: "Previous period", kn: "ಹಿಂದಿನ ಅವಧಿ", hi: "पिछली अवधि" })}
            unit={views}
            locale={locale}
            emptyText={noTraffic}
          />
        </section>

        <section className="dash-card span-4" style={card(8)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Traffic sources", kn: "ಓದುಗರು ಬಂದ ಮೂಲಗಳು", hi: "ट्रैफ़िक स्रोत" })}</h2>
              <p>{rangeLabel}</p>
            </div>
          </div>
          <DonutChart
            slices={data.sources.map((s) => ({ label: name(sourceNames, s.key, tr), value: s.value }))}
            centerLabel={views}
            emptyText={noTraffic}
            locale={locale}
          />
        </section>

        <section className="dash-card span-4" style={card(9)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Content status", kn: "ಲೇಖನಗಳ ಸ್ಥಿತಿ", hi: "सामग्री की स्थिति" })}</h2>
              <p>{tr({ en: "All articles", kn: "ಎಲ್ಲ ಲೇಖನಗಳು", hi: "सभी लेख" })}</p>
            </div>
            <Link href="/admin/posts">{tr({ en: "Manage", kn: "ನಿರ್ವಹಿಸಿ", hi: "प्रबंधित करें" })}</Link>
          </div>
          <DonutChart
            slices={data.status.filter((s) => s.value > 0).map((s) => ({ label: name(statusNames, s.key, tr), value: s.value }))}
            centerLabel={tr({ en: "articles", kn: "ಲೇಖನಗಳು", hi: "लेख" })}
            emptyText={tr({ en: "No articles yet. Write the first one.", kn: "ಇನ್ನೂ ಲೇಖನಗಳಿಲ್ಲ. ಮೊದಲನೆಯದನ್ನು ಬರೆಯಿರಿ.", hi: "अभी कोई लेख नहीं। पहला लिखें।" })}
            locale={locale}
          />
        </section>

        <section className="dash-card span-4" style={card(10)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Devices", kn: "ಸಾಧನಗಳು", hi: "डिवाइस" })}</h2>
              <p>{rangeLabel}</p>
            </div>
          </div>
          <DonutChart
            slices={data.devices.map((s) => ({ label: name(deviceNames, s.key, tr), value: s.value }))}
            centerLabel={views}
            emptyText={noTraffic}
            locale={locale}
          />
        </section>

        <section className="dash-card span-4" style={card(11)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Reading depth", kn: "ಓದಿನ ಆಳ", hi: "पढ़ने की गहराई" })}</h2>
              <p>{tr({ en: "Share of views that scrolled", kn: "ಸ್ಕ್ರಾಲ್ ಮಾಡಿದ ವೀಕ್ಷಣೆಗಳ ಪಾಲು", hi: "स्क्रॉल करने वाले व्यूज़ का हिस्सा" })}</p>
            </div>
          </div>
          <FunnelBars
            base={data.scroll.views}
            locale={locale}
            emptyText={noTraffic}
            steps={[
              { label: tr({ en: "Read 25%", kn: "25% ಓದಿದರು", hi: "25% पढ़ा" }), value: data.scroll.s25 },
              { label: tr({ en: "Read half", kn: "ಅರ್ಧ ಓದಿದರು", hi: "आधा पढ़ा" }), value: data.scroll.s50 },
              { label: tr({ en: "Read 75%", kn: "75% ಓದಿದರು", hi: "75% पढ़ा" }), value: data.scroll.s75 },
              { label: tr({ en: "Finished", kn: "ಪೂರ್ತಿ ಓದಿದರು", hi: "पूरा पढ़ा" }), value: data.scroll.s100 },
            ]}
          />
          <ul className="dash-interactions">
            <li><Share2 size={16} aria-hidden="true" /><strong>{formatValue(data.interactions.shares, "compact", locale)}</strong>{tr({ en: "shares", kn: "ಹಂಚಿಕೆ", hi: "शेयर" })}</li>
            <li><Headphones size={16} aria-hidden="true" /><strong>{formatValue(data.interactions.listens, "compact", locale)}</strong>{tr({ en: "listens", kn: "ಆಲಿಕೆ", hi: "सुना" })}</li>
            <li><PlayCircle size={16} aria-hidden="true" /><strong>{formatValue(data.interactions.videos, "compact", locale)}</strong>{tr({ en: "video plays", kn: "ವಿಡಿಯೋ ಪ್ಲೇ", hi: "वीडियो प्ले" })}</li>
          </ul>
        </section>

        <section className="dash-card span-8" style={card(12)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Top articles", kn: "ಹೆಚ್ಚು ಓದಿದ ಲೇಖನಗಳು", hi: "शीर्ष लेख" })}</h2>
              <p>{rangeLabel}</p>
            </div>
            <Link href="/admin/analytics/posts">{tr({ en: "Full report", kn: "ಪೂರ್ಣ ವರದಿ", hi: "पूरी रिपोर्ट" })}</Link>
          </div>
          {data.topPosts.length ? (
            <div className="dash-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{tr({ en: "Article", kn: "ಲೇಖನ", hi: "लेख" })}</th>
                    <th>{tr({ en: "Views", kn: "ವೀಕ್ಷಣೆ", hi: "व्यूज़" })}</th>
                    <th>{tr({ en: "Avg. time", kn: "ಸರಾಸರಿ ಸಮಯ", hi: "औसत समय" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPosts.map((post, i) => (
                    <tr key={post.id}>
                      <td><span className="dash-rank">{i + 1}</span></td>
                      <td>
                        <span className="dash-table-title">
                          {post.title || tr({ en: "Untitled article", kn: "ಶೀರ್ಷಿಕೆ ಇಲ್ಲದ ಲೇಖನ", hi: "बिना शीर्षक का लेख" })}
                        </span>
                        <span className="dash-barlist-track" aria-hidden="true">
                          <span style={{ width: `${(post.views / (data.topPosts[0].views || 1)) * 100}%`, animationDelay: `${i * 70}ms` }} />
                        </span>
                      </td>
                      <td>{formatValue(post.views, "compact", locale)}</td>
                      <td>{formatValue(post.engagedSeconds, "duration", locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dash-chart-empty is-inline">
              {tr({ en: "Your most-read articles will be ranked here.", kn: "ಹೆಚ್ಚು ಓದಿದ ಲೇಖನಗಳು ಇಲ್ಲಿ ಕ್ರಮವಾಗಿ ಕಾಣಿಸುತ್ತವೆ.", hi: "सबसे ज़्यादा पढ़े गए लेख यहाँ क्रम से दिखेंगे।" })}
            </p>
          )}
        </section>

        <section className="dash-card span-4" style={card(13)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Waiting for review", kn: "ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ", hi: "समीक्षा के लिए लंबित" })}</h2>
              <p>{tr({ en: "Needs an editor", kn: "ಸಂಪಾದಕರ ಗಮನ ಬೇಕು", hi: "संपादक की ज़रूरत" })}</p>
            </div>
            <Link href="/admin/moderation">{tr({ en: "Open", kn: "ತೆರೆಯಿರಿ", hi: "खोलें" })}</Link>
          </div>
          <ul className="dash-review">
            {data.review.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{tr(item.label)}</Link>
                <strong className={item.value ? "has-items" : ""}>
                  {item.value === null ? "—" : formatValue(item.value, "number", locale)}
                </strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="dash-card span-8" style={card(14)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Ad performance", kn: "ಜಾಹೀರಾತು ಸಾಧನೆ", hi: "विज्ञापन प्रदर्शन" })}</h2>
              <p>{rangeLabel}</p>
            </div>
            <div className="dash-ad-stats">
              <span><Eye size={14} aria-hidden="true" />{formatValue(data.ads.impressions, "compact", locale)}</span>
              <span><MousePointerClick size={14} aria-hidden="true" />{formatValue(data.ads.clicks, "compact", locale)}</span>
              <span className="dash-delta is-flat">CTR {ctr.toFixed(2)}%</span>
            </div>
          </div>
          <ComboChart
            points={data.ads.daily.map((d) => ({ day: d.day, bar: d.impressions, line: d.clicks }))}
            barLabel={tr({ en: "Impressions", kn: "ಪ್ರದರ್ಶನಗಳು", hi: "इम्प्रेशन" })}
            lineLabel={tr({ en: "Clicks", kn: "ಕ್ಲಿಕ್‌ಗಳು", hi: "क्लिक" })}
            locale={locale}
            emptyText={tr({
              en: "No ad impressions yet. Add a poster ad to start tracking.",
              kn: "ಇನ್ನೂ ಜಾಹೀರಾತು ಪ್ರದರ್ಶನಗಳಿಲ್ಲ. ಟ್ರ್ಯಾಕಿಂಗ್ ಆರಂಭಿಸಲು ಪೋಸ್ಟರ್ ಜಾಹೀರಾತು ಸೇರಿಸಿ.",
              hi: "अभी कोई विज्ञापन इम्प्रेशन नहीं। ट्रैकिंग शुरू करने के लिए पोस्टर विज्ञापन जोड़ें।",
            })}
          />
        </section>

        <section className="dash-card span-4" style={card(15)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Articles by category", kn: "ವರ್ಗವಾರು ಲೇಖನಗಳು", hi: "श्रेणी के अनुसार लेख" })}</h2>
              <p>{tr({ en: "Top categories", kn: "ಮುಖ್ಯ ವರ್ಗಗಳು", hi: "शीर्ष श्रेणियाँ" })}</p>
            </div>
            <Link href="/admin/categories">{tr({ en: "Categories", kn: "ವರ್ಗಗಳು", hi: "श्रेणियाँ" })}</Link>
          </div>
          {data.perCategory.length ? (
            <BarList unit={tr({ en: "articles", kn: "ಲೇಖನಗಳು", hi: "लेख" })} items={data.perCategory} locale={locale} />
          ) : (
            <p className="dash-chart-empty is-inline">
              {tr({ en: "Category totals appear after articles are filed.", kn: "ಲೇಖನಗಳನ್ನು ವರ್ಗಗಳಿಗೆ ಸೇರಿಸಿದ ನಂತರ ಮೊತ್ತಗಳು ಕಾಣಿಸುತ್ತವೆ.", hi: "लेख श्रेणियों में जुड़ने के बाद कुल संख्या दिखेगी।" })}
            </p>
          )}
        </section>

        <section className="dash-card span-5" style={card(16)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Recent activity", kn: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ", hi: "हाल की गतिविधि" })}</h2>
              <p>{tr({ en: "Changes by your team", kn: "ನಿಮ್ಮ ತಂಡದ ಬದಲಾವಣೆಗಳು", hi: "आपकी टीम के बदलाव" })}</p>
            </div>
            <Link href="/admin/audit">{tr({ en: "History", kn: "ಇತಿಹಾಸ", hi: "इतिहास" })}</Link>
          </div>
          {data.activity.length ? (
            <ol className="dash-timeline">
              {data.activity.map((item) => (
                <li key={item.id} className={"is-" + item.action.toLowerCase()}>
                  <Activity size={14} aria-hidden="true" />
                  <div>
                    <p>
                      <strong>{item.actor || tr({ en: "System", kn: "ವ್ಯವಸ್ಥೆ", hi: "सिस्टम" })}</strong>{" "}
                      {name(actionNames, item.action, tr)} {name(tableNames, item.table, tr)}
                    </p>
                    <span>
                      {new Intl.RelativeTimeFormat(locale + "-IN", { numeric: "auto" }).format(
                        item.minutesAgo < 60 ? -item.minutesAgo : item.minutesAgo < 1440 ? -Math.round(item.minutesAgo / 60) : -Math.round(item.minutesAgo / 1440),
                        item.minutesAgo < 60 ? "minute" : item.minutesAgo < 1440 ? "hour" : "day",
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="dash-chart-empty is-inline">
              {tr({ en: "Edits by your team will appear here.", kn: "ನಿಮ್ಮ ತಂಡದ ಸಂಪಾದನೆಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.", hi: "आपकी टीम के संपादन यहाँ दिखेंगे।" })}
            </p>
          )}
        </section>

        <section className="dash-card span-4" style={card(17)}>
          <div className="dash-card-head">
            <div>
              <h2>{tr({ en: "Upcoming events", kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು", hi: "आगामी कार्यक्रम" })}</h2>
              <p>{tr({ en: "Next on the calendar", kn: "ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಮುಂದಿನವು", hi: "कैलेंडर में आगे" })}</p>
            </div>
            <Link href="/admin/events">{tr({ en: "All events", kn: "ಎಲ್ಲ ಕಾರ್ಯಕ್ರಮಗಳು", hi: "सभी कार्यक्रम" })}</Link>
          </div>
          {data.events.length ? (
            <ul className="dash-events">
              {data.events.map((event) => (
                <li key={event.id}>
                  <span className="dash-date-chip">
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatDate(event.start, true, locale)}
                  </span>
                  <div>
                    <strong>{event.name}</strong>
                    <span>
                      {[event.place, event.daysUntil === 0
                        ? tr({ en: "today", kn: "ಇಂದು", hi: "आज" })
                        : tr({ en: `in ${event.daysUntil} days`, kn: `${event.daysUntil} ದಿನಗಳಲ್ಲಿ`, hi: `${event.daysUntil} दिन में` })]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-chart-empty is-inline">
              {tr({ en: "No upcoming events. Add one to fill the calendar.", kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ. ಕ್ಯಾಲೆಂಡರ್ ತುಂಬಲು ಒಂದನ್ನು ಸೇರಿಸಿ.", hi: "कोई आगामी कार्यक्रम नहीं। कैलेंडर भरने के लिए एक जोड़ें।" })}
            </p>
          )}
        </section>

        <section className="dash-card span-3" style={card(18)}>
          <div className="dash-card-head">
            <h2>{tr({ en: "Quick actions", kn: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು", hi: "त्वरित कार्य" })}</h2>
          </div>
          <div className="dash-actions">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link href={href} key={href}>
                <Icon size={18} aria-hidden="true" />
                {tr(label)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
