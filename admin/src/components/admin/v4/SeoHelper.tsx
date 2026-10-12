"use client";
import { useEffect, useState, type RefObject } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";
const checkLabels = {
  headline: {
    en: "Descriptive headline (15–110 characters)",
    kn: "ವಿವರಣಾತ್ಮಕ ಶೀರ್ಷಿಕೆ (15–110 ಅಕ್ಷರಗಳು)",
    hi: "वर्णनात्मक शीर्षक (15–110 अक्षर)",
  },
  description: {
    en: "Search description (60–300 characters)",
    kn: "ಹುಡುಕಾಟದ ವಿವರಣೆ (60–300 ಅಕ್ಷರಗಳು)",
    hi: "खोज विवरण (60–300 अक्षर)",
  },
  slug: {
    en: "Readable URL slug",
    kn: "ಓದಬಲ್ಲ URL ಸ್ಲಗ್",
    hi: "पढ़ने योग्य URL स्लग",
  },
  credit: { en: "Image credit", kn: "ಚಿತ್ರ ಕೃಪೆ", hi: "चित्र श्रेय" },
  category: {
    en: "Primary category selected",
    kn: "ಮುಖ್ಯ ವರ್ಗ ಆಯ್ಕೆಯಾಗಿದೆ",
    hi: "मुख्य श्रेणी चुनी गई",
  },
  summary: { en: "Story summary", kn: "ವರದಿಯ ಸಾರಾಂಶ", hi: "रिपोर्ट का सारांश" },
} satisfies Record<string, Tri>;
export function SeoHelper({
  form,
}: {
  form: RefObject<HTMLFormElement | null>;
}) {
  const { tr } = useUiStrings();
  const [checks, setChecks] = useState<{ label: Tri; ok: boolean }[]>([]);
  useEffect(() => {
    const element = form.current;
    if (!element) return;
    const update = () => {
      const f = new FormData(element);
      const title = String(f.get("seo_title") || f.get("title_kn") || "");
      const description = String(
        f.get("seo_description") || f.get("summary_kn") || "",
      );
      setChecks([
        {
          label: checkLabels.headline,
          ok: title.length >= 15 && title.length <= 110,
        },
        {
          label: checkLabels.description,
          ok: description.length >= 60 && description.length <= 300,
        },
        {
          label: checkLabels.slug,
          ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(f.get("slug") || "")),
        },
        {
          label: checkLabels.credit,
          ok: !!String(f.get("image_credit") || "").trim(),
        },
        { label: checkLabels.category, ok: !!f.get("primary_category") },
        {
          label: checkLabels.summary,
          ok: !!String(f.get("summary_points") || "").trim(),
        },
      ]);
    };
    update();
    element.addEventListener("input", update);
    element.addEventListener("change", update);
    return () => {
      element.removeEventListener("input", update);
      element.removeEventListener("change", update);
    };
  }, [form]);
  return (
    <section className="utility-panel wide">
      <h2>
        {tr({
          en: "Search readiness",
          kn: "ಹುಡುಕಾಟ ಸಿದ್ಧತೆ",
          hi: "खोज के लिए तैयारी",
        })}{" "}
        · {checks.filter((c) => c.ok).length}/{checks.length}
      </h2>
      <p className="meta">
        {tr({
          en: "Editorial checks; search ranking is not guaranteed.",
          kn: "ಸಂಪಾದಕೀಯ ಪರಿಶೀಲನೆಗಳು; ಹುಡುಕಾಟದ ಶ್ರೇಣಿಯ ಖಾತರಿ ಇಲ್ಲ.",
          hi: "संपादकीय जाँच; खोज रैंकिंग की गारंटी नहीं है।",
        })}
      </p>
      <ul>
        {checks.map((c) => (
          <li key={c.label.en}>
            {c.ok ? "✓" : "○"} {tr(c.label)}
          </li>
        ))}
      </ul>
    </section>
  );
}
