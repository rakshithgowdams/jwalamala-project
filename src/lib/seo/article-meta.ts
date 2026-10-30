/** Visible text from a summary or an HTML body, short enough for a search result. */
export function articleExcerpt(value: string, max = 160) {
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const word = cut.lastIndexOf(" ");
  return (word > 40 ? cut.slice(0, word) : cut).trimEnd() + "…";
}

/** Prefer a real editor description. A stub such as "test" falls back to the summary or body. */
export function articleDescription(
  seo: string | null | undefined,
  summary: string | null | undefined,
  body: string | null | undefined,
  title: string,
  max = 160,
) {
  const written = (seo || "").trim();
  const source = written.length >= 40 ? written : summary || body || title;
  return articleExcerpt(source || title, max);
}

/** Editor keywords first, then tags, section and place. Duplicates are dropped. */
export function articleKeywords(parts: (string | null | undefined)[], max = 16) {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const part of parts) {
    for (const bit of (part || "").split(",")) {
      const word = bit.trim();
      const key = word.toLocaleLowerCase();
      if (!word || word.length > 80 || seen.has(key)) continue;
      seen.add(key);
      keywords.push(word);
      if (keywords.length === max) return keywords;
    }
  }
  return keywords;
}
