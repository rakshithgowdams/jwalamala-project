"use client";
import { useEffect, useState, type RefObject } from "react";
export function SeoHelper({
  form,
}: {
  form: RefObject<HTMLFormElement | null>;
}) {
  const [checks, setChecks] = useState<{ label: string; ok: boolean }[]>([]);
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
          label: "Descriptive headline (15–110 characters)",
          ok: title.length >= 15 && title.length <= 110,
        },
        {
          label: "Search description (60–300 characters)",
          ok: description.length >= 60 && description.length <= 300,
        },
        {
          label: "Readable URL slug",
          ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(f.get("slug") || "")),
        },
        {
          label: "Image credit",
          ok: !!String(f.get("image_credit") || "").trim(),
        },
        { label: "Primary category selected", ok: !!f.get("primary_category") },
        {
          label: "Story summary",
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
        Search readiness · {checks.filter((c) => c.ok).length}/{checks.length}
      </h2>
      <p className="meta">
        Editorial checks; search ranking is not guaranteed.
      </p>
      <ul>
        {checks.map((c) => (
          <li key={c.label}>
            {c.ok ? "✓" : "○"} {c.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
