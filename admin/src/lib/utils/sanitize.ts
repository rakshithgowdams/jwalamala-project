import sanitizeHtml from "sanitize-html";
import { isRemoteImage } from "@/lib/utils/images";
export function cleanHtml(html: string, sponsored = false) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "blockquote",
      "a",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tag, attrs) => ({
        tagName: tag,
        attribs: {
          ...attrs,
          rel: sponsored
            ? "sponsored noopener noreferrer"
            : "noopener noreferrer",
        },
      }),
      img: (tag, attrs) => ({
        tagName: tag,
        attribs: { ...attrs, loading: "lazy" },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" &&
      !(
        /^\/images\/[^?#]*$/.test(frame.attribs.src || "") ||
        isRemoteImage(frame.attribs.src || "")
      ),
  });
}
