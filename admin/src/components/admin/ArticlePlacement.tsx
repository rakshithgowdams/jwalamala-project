"use client";

import type { Category } from "@/lib/types";
import type { Tri } from "@/lib/i18n/strings";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ARTICLE_PLACEMENTS } from "@/lib/admin/article-placements";

type MathaOption = { id: string; name_kn: string; slug: string };

export function ArticlePlacement({
  categories,
  primaryCategory,
  extraCategories,
  setExtraCategories,
  placeId,
  mathas,
  mathaIds,
  setMathaIds,
}: {
  categories: Category[];
  primaryCategory: string;
  extraCategories: Set<string>;
  setExtraCategories: (next: Set<string> | ((current: Set<string>) => Set<string>)) => void;
  placeId: string;
  mathas: MathaOption[];
  mathaIds: Set<string>;
  setMathaIds: (next: Set<string> | ((current: Set<string>) => Set<string>)) => void;
}) {
  const { tr } = useUiStrings();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const selectedIds = new Set([primaryCategory, ...extraCategories]);

  function toggleSlug(slug: string, on: boolean) {
    const category = bySlug.get(slug);
    if (!category) return;
    if (category.id === primaryCategory) return;
    setExtraCategories((current) => {
      const copy = new Set(current);
      if (on) copy.add(category.id);
      else copy.delete(category.id);
      return copy;
    });
    if (on && slug === "jain-matha" && mathas.length === 1) {
      setMathaIds(new Set([mathas[0].id]));
    }
  }

  return (
    <div className="editor-stack article-placement">
      <fieldset className="editor-checklist-box article-placement-box">
        <legend>
          {tr({
            en: "Show this article in",
            kn: "ಈ ಲೇಖನವನ್ನು ಇಲ್ಲಿ ತೋರಿಸಿ",
            hi: "यह लेख यहाँ दिखाएँ",
          })}
        </legend>
        <p className="article-placement-lead">
          {tr({
            en: "Tick sections that should list this story. Latest news sliding chips (Jain / Milan / Other state / Events) are managed in Home layout.",
            kn: "ಈ ವರದಿ ಕಾಣಿಸಬೇಕಾದ ವಿಭಾಗಗಳನ್ನು ಗುರುತಿಸಿ. ಇತ್ತೀಚಿನ ಸುದ್ದಿ ಸ್ಲೈಡ್‌ಗಳು (ಜೈನ / ಮಿಲನ್ / ಹೊರ ರಾಜ್ಯ / ಕಾರ್ಯಕ್ರಮ) ಮುಖಪುಟ ವಿನ್ಯಾಸದಲ್ಲಿ.",
            hi: "जिन अनुभागों में यह रिपोर्ट दिखे, उन्हें चुनें। ताज़ा समाचार स्लाइड (जैन / मिलन / अन्य राज्य / कार्यक्रम) होम लेआउट में हैं।",
          })}
        </p>
        <div className="article-placement-list">
          {ARTICLE_PLACEMENTS.map((item) => {
            const category = bySlug.get(item.slug);
            if (!category) {
              return (
                <label key={item.slug} className="article-placement-row is-missing">
                  <input type="checkbox" disabled />
                  <span>
                    {tr(item.label)}
                    <small>
                      {tr({
                        en: " — category missing in database",
                        kn: " — ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ವರ್ಗ ಇಲ್ಲ",
                        hi: " — डेटाबेस में श्रेणी नहीं",
                      })}
                    </small>
                  </span>
                </label>
              );
            }
            const checked = selectedIds.has(category.id);
            const disabled = category.id === primaryCategory;
            return (
              <label key={item.slug} className="article-placement-row">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => toggleSlug(item.slug, event.target.checked)}
                />
                <span>
                  {tr(item.label)}
                  {disabled ? (
                    <small>
                      {tr({
                        en: " — primary category",
                        kn: " — ಪ್ರಾಥಮಿಕ ವರ್ಗ",
                        hi: " — मुख्य श्रेणी",
                      })}
                    </small>
                  ) : null}
                  {item.needsPlace && !placeId ? (
                    <small>
                      {tr({
                        en: " — pick a district/town above",
                        kn: " — ಮೇಲೆ ಜಿಲ್ಲೆ/ಊರು ಆಯ್ಕೆಮಾಡಿ",
                        hi: " — ऊपर ज़िला/शहर चुनें",
                      })}
                    </small>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {mathas.length > 0 ? (
        <fieldset className="editor-checklist-box">
          <legend>
            {tr({
              en: "Jain mathas (when using Jain mathas section)",
              kn: "ಜೈನ ಮಠಗಳು (ಜೈನ ಮಠ ವಿಭಾಗಕ್ಕೆ)",
              hi: "जैन मठ (जैन मठ अनुभाग के लिए)",
            })}
          </legend>
          <div className="editor-scroll-list article-placement-mathas">
            {mathas.map((matha) => (
              <label key={matha.id}>
                <input
                  type="checkbox"
                  checked={mathaIds.has(matha.id)}
                  onChange={(event) => {
                    const on = event.target.checked;
                    setMathaIds((current) => {
                      const copy = new Set(current);
                      if (on) copy.add(matha.id);
                      else copy.delete(matha.id);
                      return copy;
                    });
                    if (on) toggleSlug("jain-matha", true);
                  }}
                />
                {matha.name_kn}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}

export function placementLabel(slug: string): Tri | null {
  return ARTICLE_PLACEMENTS.find((row) => row.slug === slug)?.label || null;
}
