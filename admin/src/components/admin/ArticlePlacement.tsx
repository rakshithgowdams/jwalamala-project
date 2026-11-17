"use client";

import { useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import type { Tri } from "@/lib/i18n/strings";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import {
  ARTICLE_PLACEMENTS,
  placementGroupsFor,
  type PlacementOption,
} from "@/lib/admin/article-placements";

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
  const [query, setQuery] = useState("");
  const bySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const groups = useMemo(() => placementGroupsFor(categories), [categories]);
  const selectedIds = new Set([primaryCategory, ...extraCategories]);
  const needle = query.trim().toLowerCase();
  const [openGroups, setOpenGroups] = useState(
    () =>
      new Set(
        groups
          .filter((group) =>
            group.options.some((item) => {
              const id = bySlug.get(item.slug)?.id;
              return id ? selectedIds.has(id) : false;
            }),
          )
          .map((group) => group.key),
      ),
  );

  function toggleSlug(slug: string, on: boolean) {
    const category = bySlug.get(slug);
    if (!category || category.id === primaryCategory) return;
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

  const matches = (item: PlacementOption) =>
    !needle ||
    item.slug.includes(needle) ||
    Object.values(item.label).some((text) => text.toLowerCase().includes(needle));

  function renderRow(item: PlacementOption) {
    const category = bySlug.get(item.slug);
    const rowClass =
      "article-placement-row" +
      (item.parent ? " is-child" : "") +
      (category ? "" : " is-missing");
    if (!category) {
      return (
        <label key={item.slug} className={rowClass}>
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
    const disabled = category.id === primaryCategory;
    return (
      <label key={item.slug} className={rowClass}>
        <input
          type="checkbox"
          checked={selectedIds.has(category.id)}
          disabled={disabled}
          onChange={(event) => toggleSlug(item.slug, event.target.checked)}
        />
        <span>
          {tr(item.label)}
          {disabled ? (
            <small>
              {tr({ en: " — primary category", kn: " — ಪ್ರಾಥಮಿಕ ವರ್ಗ", hi: " — मुख्य श्रेणी" })}
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
  }

  const visibleGroups = groups
    .map((group) => ({ ...group, options: group.options.filter(matches) }))
    .filter((group) => group.options.length);

  return (
    <div className="editor-stack article-placement">
      <fieldset className="editor-checklist-box article-placement-box">
        <legend>
          {tr({ en: "Show this article in", kn: "ಈ ಲೇಖನವನ್ನು ಇಲ್ಲಿ ತೋರಿಸಿ", hi: "यह लेख यहाँ दिखाएँ" })}
        </legend>
        <p className="article-placement-lead">
          {tr({
            en: "Same sections as the site menu. Tick every section and programme that should list this story.",
            kn: "ತಾಣದ ಮೆನುವಿನ ಅದೇ ವಿಭಾಗಗಳು. ಈ ವರದಿ ಕಾಣಿಸಬೇಕಾದ ಎಲ್ಲಾ ವಿಭಾಗ ಮತ್ತು ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಗುರುತಿಸಿ.",
            hi: "साइट मेन्यू जैसे ही अनुभाग। जिन अनुभागों और कार्यक्रमों में यह रिपोर्ट दिखे, उन्हें चुनें।",
          })}
        </p>
        <input
          type="search"
          className="article-placement-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tr({
            en: "Find a section or programme…",
            kn: "ವಿಭಾಗ ಅಥವಾ ಕಾರ್ಯಕ್ರಮ ಹುಡುಕಿ…",
            hi: "अनुभाग या कार्यक्रम खोजें…",
          })}
          aria-label={tr({ en: "Find a section", kn: "ವಿಭಾಗ ಹುಡುಕಿ", hi: "अनुभाग खोजें" })}
        />
        <div className="article-placement-list">
          {visibleGroups.map((group) => {
            if (group.options.length === 1 && !group.options[0].parent) {
              return renderRow(group.options[0]);
            }
            const picked = group.options.filter((item) => {
              const id = bySlug.get(item.slug)?.id;
              return id ? selectedIds.has(id) : false;
            }).length;
            return (
              <details
                key={group.key}
                className="article-placement-group"
                open={Boolean(needle) || openGroups.has(group.key)}
                onToggle={(event) => {
                  if (needle) return;
                  const isOpen = event.currentTarget.open;
                  setOpenGroups((current) => {
                    if (current.has(group.key) === isOpen) return current;
                    const copy = new Set(current);
                    if (isOpen) copy.add(group.key);
                    else copy.delete(group.key);
                    return copy;
                  });
                }}
              >
                <summary>
                  <span>{tr(group.label)}</span>
                  <span className="article-placement-count">
                    {picked ? `${picked} / ` : ""}
                    {group.options.length}
                  </span>
                </summary>
                <div className="article-placement-group-body">
                  {group.options.map(renderRow)}
                </div>
              </details>
            );
          })}
          {!visibleGroups.length ? (
            <p className="article-placement-lead">
              {tr({ en: "No section matches.", kn: "ಹೊಂದುವ ವಿಭಾಗ ಇಲ್ಲ.", hi: "कोई अनुभाग नहीं मिला।" })}
            </p>
          ) : null}
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
