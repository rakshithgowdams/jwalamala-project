/** Input must already be sanitized. Only top-level paragraphs can host an ad break. */
export function articleSections(html: string): string[] {
  const ends: number[] = [];
  const stack: string[] = [];
  const tags = /<(\/)?([a-z][a-z0-9]*)(?:\s[^>]*)?>/gi;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    const name = match[2].toLowerCase();
    if (match[1]) {
      if (stack.at(-1) === name) stack.pop();
      if (name === "p" && stack.length === 0) ends.push(tags.lastIndex);
    } else if (
      !["br", "img", "hr", "input"].includes(name) &&
      !match[0].endsWith("/>")
    )
      stack.push(name);
  }
  if (ends.length < 8) return [html];
  return [
    html.slice(0, ends[1]),
    html.slice(ends[1], ends[5]),
    html.slice(ends[5]),
  ];
}
