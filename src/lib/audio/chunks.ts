export function splitSpeech(text: string, limit = 2400) {
  if (!Number.isInteger(limit) || limit < 100)
    throw Error("Invalid chunk limit");
  const clean = text.replace(/\s+/g, " ").trim(),
    sentences = clean.match(/[^.!?।]+[.!?।]*/gu) || [];
  const chunks: string[] = [];
  let current = "";
  const length = (s: string) => Array.from(s).length;
  const append = (part: string) => {
    if (length(current + (current ? " " : "") + part) > limit) {
      if (current) chunks.push(current);
      current = part;
    } else current += (current ? " " : "") + part;
  };
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (length(s) <= limit) {
      append(s);
      continue;
    }
    for (const word of s.split(/\s+/)) {
      const points = Array.from(word);
      for (let start = 0; start < points.length; start += limit)
        append(points.slice(start, start + limit).join(""));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
