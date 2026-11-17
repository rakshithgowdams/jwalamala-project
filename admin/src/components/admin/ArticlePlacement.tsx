"use client";

import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Category } from "@/lib/types";
import type { Tri } from "@/lib/i18n/strings";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ARTICLE_PLACEMENTS } from "@/lib/admin/article-placements";

type MathaOption = { id: string; name_kn: string; slug: string };
type LatestLabel = { id: string; title_kn: string };

const THIS_KEY = "__this__";

export function ArticlePlacement({
  categories,
  primaryCategory,
  extraCategories,
  setExtraCategories,
  placeId,
  mathas,
  mathaIds,
  setMathaIds,
  pinLatest,
  setPinLatest,
  latestIds,
  setLatestIds,
  latestLabels = [],
  postId,
  postTitle,
}: {
  categories: Category[];
  primaryCategory: string;
  extraCategories: Set<string>;
  setExtraCategories: (next: Set<string> | ((current: Set<string>) => Set<string>)) => void;
  placeId: string;
  mathas: MathaOption[];
  mathaIds: Set<string>;
  setMathaIds: (next: Set<string> | ((current: Set<string>) => Set<string>)) => void;
  pinLatest: boolean;
  setPinLatest: (value: boolean) => void;
  latestIds: string[];
  setLatestIds: (next: string[] | ((current: string[]) => string[])) => void;
  latestLabels?: LatestLabel[];
  postId?: string;
  postTitle?: string;
}) {
  const { tr } = useUiStrings();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const selectedIds = new Set([primaryCategory, ...extraCategories]);
  const titleById = new Map(latestLabels.map((row) => [row.id, row.title_kn]));
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);

  const orderKeys = (() => {
    if (!pinLatest) return [] as string[];
    if (postId) {
      return latestIds.includes(postId) ? latestIds : [...latestIds, postId];
    }
    if (draftOrder) return draftOrder;
    return [...latestIds.filter((id) => id !== THIS_KEY), THIS_KEY];
  })();

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

  function applyOrder(keys: string[]) {
    if (postId) {
      setLatestIds(keys.filter((key) => key !== THIS_KEY));
      return;
    }
    setDraftOrder(keys);
    setLatestIds(keys.filter((key) => key !== THIS_KEY));
  }

  function onDrop(toIndex: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragOver(null);
    if (from === null || from === toIndex) return;
    const next = [...orderKeys];
    const [row] = next.splice(from, 1);
    next.splice(toIndex, 0, row);
    applyOrder(next);
  }

  function labelFor(key: string) {
    if (key === THIS_KEY || key === postId) {
      return (
        postTitle?.trim() ||
        tr({
          en: "This article",
          kn: "ಈ ಲೇಖನ",
          hi: "यह लेख",
        })
      );
    }
    return (
      titleById.get(key) ||
      tr({ en: "Pinned article", kn: "ಪಿನ್ ಲೇಖನ", hi: "पिन लेख" })
    );
  }

  const latestRank = orderKeys.findIndex((key) => key === postId || key === THIS_KEY);

  return (
    <div className="editor-stack article-placement">
      <fieldset className="editor-checklist-box article-placement-box">
        <legend>
          {tr({
            en: "Required — where should this article show?",
            kn: "ಅಗತ್ಯ — ಈ ಲೇಖನ ಎಲ್ಲಿ ಕಾಣಿಸಬೇಕು?",
            hi: "आवश्यक — यह लेख कहाँ दिखे?",
          })}
        </legend>
        <p className="article-placement-lead">
          {tr({
            en: "Choose every section that should list this story. District items also need a district/town above.",
            kn: "ಈ ವರದಿ ಕಾಣಿಸಬೇಕಾದ ಪ್ರತಿ ವಿಭಾಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಜಿಲ್ಲಾ ವಿಭಾಗಗಳಿಗೆ ಮೇಲೆ ಜಿಲ್ಲೆ/ಊರು ಬೇಕು.",
            hi: "यह रिपोर्ट जिन अनुभागों में दिखे, उन्हें चुनें। ज़िला अनुभागों के लिए ऊपर ज़िला/शहर भी चाहिए।",
          })}
        </p>

        <label className="article-placement-row article-placement-latest-row">
          <input
            type="checkbox"
            checked={pinLatest}
            onChange={(event) => {
              const on = event.target.checked;
              setPinLatest(on);
              if (!on) {
                setDraftOrder(null);
                setLatestIds((current) =>
                  current.filter((id) => id !== postId && id !== THIS_KEY),
                );
                return;
              }
              if (postId) {
                setLatestIds((current) =>
                  current.includes(postId) ? current : [...current, postId].slice(0, 24),
                );
              } else {
                setDraftOrder([...latestIds.filter((id) => id !== THIS_KEY), THIS_KEY]);
              }
            }}
          />
          <span>
            <strong>
              {tr({
                en: "Latest news (home)",
                kn: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ (ಮುಖಪುಟ)",
                hi: "ताज़ा समाचार (होम)",
              })}
            </strong>
            <small>
              {tr({
                en: " — pin and drag to set order",
                kn: " — ಪಿನ್ ಮಾಡಿ, ಎಳೆದು ಕ್ರಮ ಹೊಂದಿಸಿ",
                hi: " — पिन करें और खींचकर क्रम तय करें",
              })}
            </small>
          </span>
        </label>

        {pinLatest ? (
          <div className="article-placement-drag" aria-label={tr({ en: "Latest news order", kn: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ ಕ್ರಮ", hi: "ताज़ा समाचार क्रम" })}>
            <p className="article-placement-drag-help">
              {tr({
                en: "Drag the handle to reorder. Pinned stories appear first on home Latest news.",
                kn: "ಕ್ರಮ ಬದಲಾಯಿಸಲು ಹ್ಯಾಂಡಲ್ ಎಳೆಯಿರಿ. ಪಿನ್ ಲೇಖನಗಳು ಮುಖಪುಟದ ಇತ್ತೀಚಿನ ಸುದ್ದಿಯಲ್ಲಿ ಮೊದಲು.",
                hi: "क्रम बदलने के लिए हैंडल खींचें। पिन लेख होम ताज़ा समाचार में पहले आते हैं।",
              })}
            </p>
            <ol className="article-placement-drag-list">
              {orderKeys.map((key, index) => {
                const isThis = key === THIS_KEY || key === postId;
                return (
                  <li
                    key={key}
                    className={
                      "article-placement-drag-item" +
                      (isThis ? " is-current" : "") +
                      (dragOver === index ? " is-over" : "")
                    }
                    draggable
                    onDragStart={() => {
                      dragFrom.current = index;
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(index);
                    }}
                    onDragLeave={() => setDragOver((current) => (current === index ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDrop(index);
                    }}
                    onDragEnd={() => {
                      dragFrom.current = null;
                      setDragOver(null);
                    }}
                  >
                    <span className="article-placement-drag-handle" aria-hidden="true">
                      <GripVertical size={16} />
                    </span>
                    <span className="article-placement-drag-index">{index + 1}</span>
                    <span className="article-placement-drag-title">{labelFor(key)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

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

      <input type="hidden" name="pin_latest" value={pinLatest ? "1" : ""} />
      <input type="hidden" name="latest_ids" value={JSON.stringify(latestIds.filter((id) => id !== THIS_KEY))} />
      <input
        type="hidden"
        name="latest_rank"
        value={pinLatest && latestRank >= 0 ? String(latestRank) : ""}
      />
    </div>
  );
}

export function placementLabel(slug: string): Tri | null {
  return ARTICLE_PLACEMENTS.find((row) => row.slug === slug)?.label || null;
}
