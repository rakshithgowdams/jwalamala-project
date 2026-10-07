"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveHome } from "@/app/admin/home/actions";
import { type HomeConfig } from "@/lib/v4/home";
const labels: Record<string, string> = {
  lead: "ಮುಖ್ಯ ಸುದ್ದಿ",
  events: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
  latest: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ",
  videos: "ವೀಡಿಯೊಗಳು",
  picks: "ಸಂಪಾದಕರ ಆಯ್ಕೆ",
  explore: "ವಿಶೇಷ ಸುದ್ದಿ",
  jain: "ಜೈನ ಸಮಯಗಳು",
  submit: "ಸುದ್ದಿ ಕಳುಹಿಸಿ",
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
  const [config, setConfig] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
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
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await saveHome(config);
          setMessage(result.error || "ವಿನ್ಯಾಸ ಉಳಿಸಲಾಗಿದೆ.");
        });
      }}
    >
      <p className="wide">
        ವಿಭಾಗಗಳನ್ನು ಮೇಲಕ್ಕೆ / ಕೆಳಕ್ಕೆ ಸರಿಸಿ. ಮರೆಮಾಡಿದ ವಿಭಾಗಗಳು ಮುಖಪುಟದಲ್ಲಿ
        ಕಾಣಿಸುವುದಿಲ್ಲ.
      </p>
      <fieldset className="wide">
        <legend>Additional homepage sections</legend>
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
        Featured photograph gallery
        <select
          value={config.photo_gallery_id}
          onChange={(e) =>
            setConfig({ ...config, photo_gallery_id: e.target.value })
          }
        >
          <option value="">Latest gallery</option>
          {galleries.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field wide">
        ಮುಖ್ಯ ಸುದ್ದಿ
        <select
          value={config.lead_id}
          onChange={(e) => setConfig({ ...config, lead_id: e.target.value })}
        >
          <option value="">ಸ್ವಯಂಚಾಲಿತ ಆಯ್ಕೆ</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title_kn}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="field wide">
        <legend>ಸಂಪಾದಕರ ಆಯ್ಕೆ — ಆಯ್ಕೆ ಮಾಡಿದ ಕ್ರಮದಲ್ಲಿ</legend>
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
      {config.sections.map((s, index) => (
        <fieldset key={s.id} className="field wide">
          <legend>
            {index + 1}. {labels[s.id]}
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
              ತೋರಿಸಿ
            </label>
            <button
              type="button"
              className="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={labels[s.id] + " ಮೇಲಕ್ಕೆ"}
            >
              ↑
            </button>
            <button
              type="button"
              className="button"
              disabled={index === config.sections.length - 1}
              onClick={() => move(index, 1)}
              aria-label={labels[s.id] + " ಕೆಳಕ್ಕೆ"}
            >
              ↓
            </button>
            <label>
              ಲೇಖನಗಳು
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
              ವಿಭಾಗ
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
                <option value="">ಎಲ್ಲಾ</option>
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
          ವಿನ್ಯಾಸ ಉಳಿಸಿ
        </button>{" "}
        <Link className="button" href="/" target="_blank">
          ಮುಖಪುಟ ವೀಕ್ಷಿಸಿ
        </Link>
        <p role="status">{message}</p>
      </div>
    </form>
  );
}
