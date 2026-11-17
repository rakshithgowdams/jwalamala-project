"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveHome } from "@/app/admin/home/actions";
import { defaultLatestLinks, type HomeConfig } from "@/lib/v4/home";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";
const labels: Record<string, Tri> = {
  lead: { en: "Lead story", kn: "ಮುಖ್ಯ ಸುದ್ದಿ", hi: "मुख्य समाचार" },
  events: {
    en: "Upcoming events",
    kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
    hi: "आगामी कार्यक्रम",
  },
  latest: { en: "Latest news", kn: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ", hi: "ताज़ा समाचार" },
  videos: { en: "Videos", kn: "ವೀಡಿಯೊಗಳು", hi: "वीडियो" },
  picks: { en: "Editor's picks", kn: "ಸಂಪಾದಕರ ಆಯ್ಕೆ", hi: "संपादक की पसंद" },
  explore: { en: "Special stories", kn: "ವಿಶೇಷ ಸುದ್ದಿ", hi: "विशेष समाचार" },
  jain: { en: "Jain timings", kn: "ಜೈನ ಸಮಯಗಳು", hi: "जैन समय" },
  submit: { en: "Send news", kn: "ಸುದ್ದಿ ಕಳುಹಿಸಿ", hi: "समाचार भेजें" },
};
export function HomeBuilder({
  initial,
  posts,
  categories,
  galleries,
}: {
  initial: HomeConfig;
  posts: { id: string; title_kn: string }[];
  categories: { slug: string; name_kn: string }[];
  galleries: { id: string; title_kn: string }[];
}) {
  const { tr } = useUiStrings();
  const [config, setConfig] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
  const label = (id: string) => (labels[id] ? tr(labels[id]) : id);
  function move(index: number, delta: number) {
    setConfig((c) => {
      const sections = [...c.sections];
      [sections[index], sections[index + delta]] = [
        sections[index + delta],
        sections[index],
      ];
      return { ...c, sections };
    });
  }
  const latestLinks = config.latest_links?.length
    ? config.latest_links
    : defaultLatestLinks;
  function moveLatestLink(index: number, delta: number) {
    setConfig((c) => {
      const links = [...(c.latest_links?.length ? c.latest_links : defaultLatestLinks)];
      const next = index + delta;
      if (next < 0 || next >= links.length) return c;
      [links[index], links[next]] = [links[next], links[index]];
      return { ...c, latest_links: links };
    });
  }
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await saveHome(config);
          setMessage(
            result.error ||
              tr({
                en: "Layout saved.",
                kn: "ವಿನ್ಯಾಸ ಉಳಿಸಲಾಗಿದೆ.",
                hi: "लेआउट सहेजा गया।",
              }),
          );
        });
      }}
    >
      <p className="wide">
        {tr({
          en: "Move sections up / down. Hidden sections do not appear on the homepage.",
          kn: "ವಿಭಾಗಗಳನ್ನು ಮೇಲಕ್ಕೆ / ಕೆಳಕ್ಕೆ ಸರಿಸಿ. ಮರೆಮಾಡಿದ ವಿಭಾಗಗಳು ಮುಖಪುಟದಲ್ಲಿ ಕಾಣಿಸುವುದಿಲ್ಲ.",
          hi: "अनुभागों को ऊपर / नीचे करें। छिपे हुए अनुभाग मुखपृष्ठ पर नहीं दिखते।",
        })}
      </p>
      <fieldset className="wide">
        <legend>
          {tr({
            en: "Additional homepage sections",
            kn: "ಮುಖಪುಟದ ಹೆಚ್ಚುವರಿ ವಿಭಾಗಗಳು",
            hi: "मुखपृष्ठ के अतिरिक्त अनुभाग",
          })}
        </legend>
        {Object.entries(config.extras).map(([key, enabled]) => (
          <label className="poll-option" key={key}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  extras: { ...config.extras, [key]: e.target.checked },
                })
              }
            />
            {key}
          </label>
        ))}
      </fieldset>
      <label className="field wide">
        {tr({
          en: "Featured photograph gallery",
          kn: "ವಿಶೇಷ ಚಿತ್ರ ಗ್ಯಾಲರಿ",
          hi: "विशेष फ़ोटो गैलरी",
        })}
        <select
          value={config.photo_gallery_id}
          onChange={(e) =>
            setConfig({ ...config, photo_gallery_id: e.target.value })
          }
        >
          <option value="">
            {tr({
              en: "Latest gallery",
              kn: "ಇತ್ತೀಚಿನ ಗ್ಯಾಲರಿ",
              hi: "नवीनतम गैलरी",
            })}
          </option>
          {galleries.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field wide">
        {tr(labels.lead)}
        <select
          value={config.lead_id}
          onChange={(e) => setConfig({ ...config, lead_id: e.target.value })}
        >
          <option value="">
            {tr({
              en: "Automatic selection",
              kn: "ಸ್ವಯಂಚಾಲಿತ ಆಯ್ಕೆ",
              hi: "स्वचालित चयन",
            })}
          </option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title_kn}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="field wide">
        <legend>
          {tr({
            en: "Editor's picks — in the order selected",
            kn: "ಸಂಪಾದಕರ ಆಯ್ಕೆ — ಆಯ್ಕೆ ಮಾಡಿದ ಕ್ರಮದಲ್ಲಿ",
            hi: "संपादक की पसंद — चुने गए क्रम में",
          })}
        </legend>
        {posts.slice(0, 60).map((p) => (
          <label key={p.id} className="chip">
            <input
              type="checkbox"
              checked={config.pick_ids.includes(p.id)}
              disabled={
                !config.pick_ids.includes(p.id) && config.pick_ids.length >= 12
              }
              onChange={(e) =>
                setConfig({
                  ...config,
                  pick_ids: e.target.checked
                    ? [...config.pick_ids, p.id]
                    : config.pick_ids.filter((id) => id !== p.id),
                })
              }
            />
            {p.title_kn}
          </label>
        ))}
      </fieldset>
      <fieldset className="field wide">
        <legend>
          {tr({
            en: "Latest news sliding links (home)",
            kn: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ ಸ್ಲೈಡ್ ಲಿಂಕ್‌ಗಳು (ಮುಖಪುಟ)",
            hi: "ताज़ा समाचार स्लाइड लिंक (होम)",
          })}
        </legend>
        <p className="field-hint" style={{ marginBottom: 8 }}>
          {tr({
            en: "These chips slide under Latest news. Click opens that page. Reorder with ↑ ↓.",
            kn: "ಇವು ಇತ್ತೀಚಿನ ಸುದ್ದಿ ಕೆಳಗೆ ಸ್ಲೈಡ್ ಆಗುತ್ತವೆ. ಕ್ಲಿಕ್‌ನಿಂದ ಆ ಪುಟ ತೆರೆಯುತ್ತದೆ. ↑ ↓ ನಿಂದ ಕ್ರಮ.",
            hi: "ये चिप्स ताज़ा समाचार के नीचे स्लाइड होते हैं। क्लिक से वह पेज खुलता है। ↑ ↓ से क्रम।",
          })}
        </p>
        {latestLinks.map((link, index) => (
          <div key={link.id} className="chip" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="chip" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={link.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    latest_links: latestLinks.map((row, i) =>
                      i === index ? { ...row, enabled: e.target.checked } : row,
                    ),
                  })
                }
              />
              {link.label_kn}
              <small style={{ marginLeft: 6 }}>{link.href}</small>
            </label>
            <button
              type="button"
              className="button is-compact"
              disabled={index === 0}
              onClick={() => moveLatestLink(index, -1)}
              aria-label={tr({ en: "Move up", kn: "ಮೇಲಕ್ಕೆ", hi: "ऊपर" })}
            >
              ↑
            </button>
            <button
              type="button"
              className="button is-compact"
              disabled={index === latestLinks.length - 1}
              onClick={() => moveLatestLink(index, 1)}
              aria-label={tr({ en: "Move down", kn: "ಕೆಳಕ್ಕೆ", hi: "नीचे" })}
            >
              ↓
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-outline is-compact"
          onClick={() =>
            setConfig({ ...config, latest_links: defaultLatestLinks })
          }
        >
          {tr({
            en: "Reset to Jain / Milan / Other state / Events",
            kn: "ಜೈನ / ಮಿಲನ್ / ಹೊರ ರಾಜ್ಯ / ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಮರುಹೊಂದಿಸಿ",
            hi: "जैन / मिलन / अन्य राज्य / कार्यक्रम पर रीसेट",
          })}
        </button>
      </fieldset>
      {config.sections.map((s, index) => (
        <fieldset key={s.id} className="field wide">
          <legend>
            {index + 1}. {label(s.id)}
          </legend>
          <div className="category-chips">
            <label className="chip">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: config.sections.map((row) =>
                      row.id === s.id
                        ? { ...row, enabled: e.target.checked }
                        : row,
                    ),
                  })
                }
              />
              {tr({ en: "Show", kn: "ತೋರಿಸಿ", hi: "दिखाएँ" })}
            </label>
            <button
              type="button"
              className="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={
                label(s.id) + tr({ en: " up", kn: " ಮೇಲಕ್ಕೆ", hi: " ऊपर" })
              }
            >
              ↑
            </button>
            <button
              type="button"
              className="button"
              disabled={index === config.sections.length - 1}
              onClick={() => move(index, 1)}
              aria-label={
                label(s.id) + tr({ en: " down", kn: " ಕೆಳಕ್ಕೆ", hi: " नीचे" })
              }
            >
              ↓
            </button>
            <label>
              {tr({ en: "Articles", kn: "ಲೇಖನಗಳು", hi: "लेख" })}
              <input
                type="number"
                min="1"
                max="12"
                value={s.count}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: config.sections.map((row) =>
                      row.id === s.id
                        ? { ...row, count: Number(e.target.value) }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <label>
              {tr({ en: "Category", kn: "ವಿಭಾಗ", hi: "श्रेणी" })}
              <select
                value={s.category_slug}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sections: config.sections.map((row) =>
                      row.id === s.id
                        ? { ...row, category_slug: e.target.value }
                        : row,
                    ),
                  })
                }
              >
                <option value="">
                  {tr({ en: "All", kn: "ಎಲ್ಲಾ", hi: "सभी" })}
                </option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name_kn}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      ))}
      <div className="wide">
        <button className="button button-ember" disabled={busy}>
          {tr({ en: "Save layout", kn: "ವಿನ್ಯಾಸ ಉಳಿಸಿ", hi: "लेआउट सहेजें" })}
        </button>{" "}
        <Link className="button" href="/" target="_blank">
          {tr({
            en: "View homepage",
            kn: "ಮುಖಪುಟ ವೀಕ್ಷಿಸಿ",
            hi: "मुखपृष्ठ देखें",
          })}
        </Link>
        <p role="status">{message}</p>
      </div>
    </form>
  );
}
