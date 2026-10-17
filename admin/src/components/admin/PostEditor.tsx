"use client";
import {
  saveRecovery,
  loadRecovery,
  clearRecovery,
} from "@/app/admin/recovery/actions";
import { useState, useRef, useEffect, type ClipboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import TiptapImage from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { AlertCircle, Bold, ExternalLink, List, Heading2, Save, Languages, RefreshCw, X } from "lucide-react";
import type { Category, Post } from "@/lib/types";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { savePost } from "@/app/admin/actions";
import { coverImageUrl, imageUrlFromPaste, parseImageLink } from "@/lib/utils/images";
import { slugify } from "@/lib/utils/slug";
import { site } from "@/config/site";
import type { PlaceOption } from "@/lib/places/search";
import { PlacePicker } from "./PlacePicker";
import { FacebookLogo, YouTubeLogo } from "./BrandIcons";
import { DeletePostButton } from "./DeletePostButton";
import { RestorePostButton } from "./RestorePostButton";
import { videoFromInput } from "@/lib/utils/video";

/** datetime-local inputs are entered in India time. */
const istInput = (value?: string | null) =>
  value ? new Date(Date.parse(value) + 19800000).toISOString().slice(0, 16) : "";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="editor-section">
      <header>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="editor-grid">{children}</div>
    </section>
  );
}

/**
 * Replaces each paragraph that holds nothing but an image link (ImageKit,
 * YouTube thumbnail or video, /images/ path, or Markdown ![alt](url)) with the
 * image itself, so editors paste a link and see — and publish — the picture.
 * Only top-level paragraphs: an image cannot sit directly inside a list item.
 */
function showLinkedImages(view: Editor["view"]) {
  if (view.isDestroyed) return;
  const { state } = view;
  const image = state.schema.nodes.image;
  if (!image) return;
  const found: { from: number; to: number; src: string; alt: string }[] = [];
  state.doc.forEach((node, offset) => {
    if (node.type.name !== "paragraph" || !node.childCount) return;
    const text = node.textContent.trim();
    // A paragraph that is one link pointing at an image: its words become the description.
    const hrefs = new Set<string>();
    node.forEach((child) => hrefs.add(child.marks.find((m) => m.type.name === "link")?.attrs.href ?? ""));
    const href = hrefs.size === 1 ? [...hrefs][0] : "";
    const linkedByHref = href ? parseImageLink(href) : null;
    if (linkedByHref) {
      const alt = text === href.trim() ? "" : text;
      found.push({ from: offset, to: offset + node.nodeSize, src: linkedByHref.src, alt });
      return;
    }
    if (!text || (/\s/.test(text) && !text.startsWith("!["))) return;
    const linked = parseImageLink(text);
    if (linked) found.push({ from: offset, to: offset + node.nodeSize, src: linked.src, alt: linked.alt });
  });
  if (!found.length) return;
  const tr = state.tr;
  for (const { from, to, src, alt } of found.reverse())
    tr.replaceWith(from, to, image.create({ src, alt: alt || null }));
  view.dispatch(tr);
}

/** Older and low-resolution videos have no HD thumbnail; YouTube then serves a 120×90 placeholder. */
async function bestThumbnail(src: string) {
  if (!(src.startsWith("https://i.ytimg.com/") && src.endsWith("/maxresdefault.jpg"))) return src;
  const loads = await new Promise<boolean>((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(probe.naturalWidth > 120);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
  return loads ? src : src.replace(/\/maxresdefault\.jpg$/, "/hqdefault.jpg");
}

export function PostEditor({
  post,
  categories,
  canPublish,
  canDelete = false,
  choices,
}: {
  post?: Post;
  categories: Category[];
  canPublish: boolean;
  canDelete?: boolean;
  choices: {
    tags: { id: string; name_kn: string }[];
    places: PlaceOption[];
    authors: { id: string; name_kn: string }[];
    events: { id: string; name_kn: string }[];
  };
}) {
  const { kn, v4: t, tr, l } = useUiStrings();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState(""),
    [imageAlt, setImageAlt] = useState(""),
    [imageLink, setImageLink] = useState(""),
    [imageLinkError, setImageLinkError] = useState("");
  // A published URL must not change on its own, so only new articles follow the title.
  const [slug, setSlug] = useState(post?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!post?.slug);
  const [cover, setCover] = useState(post?.thumbnail_url || "/images/jwalamala-logo.jpg");
  const [coverNote, setCoverNote] = useState("");
  const [coverBroken, setCoverBroken] = useState(false);
  const [placeId, setPlaceId] = useState(post?.place_id || "");
  const [sponsored, setSponsored] = useState(Boolean(post?.sponsor_name?.trim()));
  const formRef = useRef<HTMLFormElement>(null);
  const placeTextRef = useRef<HTMLInputElement>(null);
  const [saveError, setSaveError] = useState("");
  const linkIsImage = Boolean(linkUrl.trim() && parseImageLink(linkUrl));
  const imagePreview = imageLink.trim() ? parseImageLink(imageLink)?.src || "" : "";
  const [videoInput, setVideoInput] = useState(post?.video_url || "");
  const video = videoInput.trim() ? videoFromInput(videoInput) : null;

  function clearInvalid() {
    formRef.current
      ?.querySelectorAll('[aria-invalid="true"]')
      .forEach((element) => element.removeAttribute("aria-invalid"));
  }

  /** Scrolls to the field a failed save names, opening any collapsed panel around it. */
  function markInvalid(field: string) {
    const form = formRef.current;
    if (!form) return;
    const named = form.elements.namedItem(field);
    const first = named instanceof RadioNodeList ? named[0] : named;
    const target =
      field === "place_id"
        ? form.querySelector<HTMLElement>('.place-picker input[role="combobox"]')
        : field === "body_html"
          ? form.querySelector<HTMLElement>(".ProseMirror")
          : first instanceof HTMLInputElement && first.type === "hidden"
            ? null
            : (first as HTMLElement | null);
    if (!target) return;
    for (let panel = target.closest("details"); panel; panel = panel.parentElement?.closest("details") ?? null)
      panel.open = true;
    target.setAttribute("aria-invalid", "true");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus({ preventScroll: true });
    const clear = () => target.removeAttribute("aria-invalid");
    target.addEventListener("input", clear, { once: true });
    target.addEventListener("change", clear, { once: true });
  }
  const titleRef = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const [recovery, setRecovery] = useState("");
  const recoveryKey = "jwalamala-draft-" + (post?.id || "new");

  const router = useRouter();
  const editor = useEditor({
    extensions: [StarterKit, TiptapImage, TableKit],
    immediatelyRender: false,
    onUpdate: () => {
      dirty.current = true;
    },
    // Articles saved before images were converted may still hold bare image links.
    onCreate: ({ editor: created }) => showLinkedImages(created.view),
    editorProps: {
      handlePaste: (view) => {
        // Let the paste land first, then turn any image link it added into the image.
        setTimeout(() => showLinkedImages(view));
        return false;
      },
    },
    content: post?.body_html || "<p></p>",
  });
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    const timer = window.setInterval(async () => {
      if (!dirty.current || !formRef.current) return;
      try {
        const data = new FormData(formRef.current);
        sessionStorage.setItem(
          recoveryKey,
          JSON.stringify({ fields: Array.from(data.entries()), body: editor?.getJSON() }),
        );
        const saved = await saveRecovery({
          key: recoveryKey,
          postId: post?.id,
          snapshot: {
            fields: Array.from(data.entries()).filter((entry) => typeof entry[1] === "string"),
            body: editor?.getJSON(),
          },
        });
        setRecovery(
          saved.error
            ? tr({ en: "Draft saved in this tab.", kn: "ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಕರಡು ಪ್ರತಿ ಉಳಿಸಲಾಗಿದೆ.", hi: "इस टैब में ड्राफ़्ट सहेजा गया।" })
            : tr({ en: "Draft saved to your account.", kn: "ಕರಡು ಪ್ರತಿ ಖಾತೆಯಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.", hi: "ड्राफ़्ट आपके खाते में सहेजा गया।" }),
        );
      } catch {}
    }, 30000);
    return () => {
      window.removeEventListener("beforeunload", guard);
      window.clearInterval(timer);
    };
  });

  async function restoreDraft() {
    try {
      const draft =
        JSON.parse(sessionStorage.getItem(recoveryKey) || "null") ||
        (await loadRecovery(recoveryKey))?.snapshot;
      if (!draft) {
        setRecovery(tr({ en: "No saved draft in this tab.", kn: "ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಉಳಿಸಿದ ಪ್ರತಿ ಇಲ್ಲ.", hi: "इस टैब में कोई सहेजा गया ड्राफ़्ट नहीं है।" }));
        return;
      }
      const valueOf = (name: string) =>
        (draft.fields as string[][]).find((entry) => entry[0] === name)?.[1];
      for (const element of Array.from(formRef.current?.elements || [])) {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        ) {
          // Sponsorship is switched on deliberately, never by a restored draft.
          if (element.name === "sponsor_name" && element.type === "hidden") continue;
          const values = draft.fields
            .filter((entry: string[]) => entry[0] === element.name)
            .map((entry: string[]) => entry[1]);
          if (element instanceof HTMLInputElement && element.type === "checkbox")
            element.checked = values.includes(element.value);
          else if (values.length) element.value = values[0];
        }
      }
      if (valueOf("slug") !== undefined) {
        setSlug(valueOf("slug") || "");
        setSlugTouched(true);
      }
      if (valueOf("thumbnail_url") !== undefined) setCover(valueOf("thumbnail_url") || "");
      if (valueOf("place_id") !== undefined) setPlaceId(valueOf("place_id") || "");
      if (valueOf("video_url") !== undefined) setVideoInput(valueOf("video_url") || "");
      if (draft.body) editor?.commands.setContent(draft.body);
      dirty.current = true;
      setRecovery(tr({ en: "Draft restored. Review it, then save.", kn: "ಕರಡು ಪ್ರತಿ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ. ಪರಿಶೀಲಿಸಿ ಉಳಿಸಿ.", hi: "ड्राफ़्ट बहाल किया गया। जाँचकर सहेजें।" }));
    } catch {
      setRecovery(tr({ en: "Could not read the draft.", kn: "ಕರಡು ಪ್ರತಿ ಓದಲಾಗಲಿಲ್ಲ.", hi: "ड्राफ़्ट पढ़ा नहीं जा सका।" }));
    }
  }

  const keyPointsText = (post?.key_points || [])
    .slice()
    .sort((a, b) => a.seconds - b.seconds)
    .map((p) => Math.floor(p.seconds / 60) + ":" + String(p.seconds % 60).padStart(2, "0") + " " + p.label_kn)
    .join("\n");
  const previewSrc =
    coverImageUrl(cover) || (cover.trim().startsWith("/images/") ? cover.trim() : "");

  function onCoverPaste(event: ClipboardEvent<HTMLElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const url = imageUrlFromPaste(html, text);
    if (url) {
      event.preventDefault();
      setCover(url);
      setCoverNote("");
      setCoverBroken(false);
      return;
    }
    const pastedFile = [...event.clipboardData.files].some((file) => file.type.startsWith("image/"));
    if (pastedFile || /<img\b/i.test(html)) {
      event.preventDefault();
      setCoverNote(
        tr({
          en: "That paste was the picture itself. Right-click the picture, choose Copy image address, and paste the link here.",
          kn: "ಅಂಟಿಸಿದ್ದು ಚಿತ್ರದ ಫೈಲ್. ಚಿತ್ರದ ಮೇಲೆ ರೈಟ್-ಕ್ಲಿಕ್ ಮಾಡಿ, Copy image address ಆಯ್ಕೆಮಾಡಿ, ಆ ಲಿಂಕ್ ಅನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ.",
          hi: "यह पेस्ट चित्र फ़ाइल है। चित्र पर राइट-क्लिक करें, Copy image address चुनें, और वह लिंक यहाँ चिपकाएँ।",
        }),
      );
    }
  }

  return (
    <form
      ref={formRef}
      onChange={() => {
        dirty.current = true;
      }}
      className="post-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!editor) return;
        showLinkedImages(editor.view);
        setBusy(true);
        setSaveError("");
        clearInvalid();
        const data = new FormData(event.currentTarget);
        try {
          const result = await savePost({
            ...Object.fromEntries(data),
            id: post?.id,
            category_ids: data.getAll("category_ids"),
            tag_ids: data.getAll("tag_ids"),
            is_featured: data.has("is_featured"),
            is_breaking: data.has("is_breaking"),
            is_live: data.has("is_live"),
            allow_comments: data.has("allow_comments"),
            hide_ads: data.has("hide_ads"),
            audio_enabled: data.has("audio_enabled"),
            meaningful_edit: data.has("meaningful_edit"),
            body_html: editor.getHTML(),
            body_json: JSON.stringify(editor.getJSON()),
          });
          setBusy(false);
          const published = data.get("status") === "published";
          setMessage(
            result.error
              ? l(result.error)
              : published
                ? tr({
                    en: "Published. English and Hindi versions appear in a few seconds.",
                    kn: "ಪ್ರಕಟಿಸಲಾಗಿದೆ. ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಹಿಂದಿ ಆವೃತ್ತಿಗಳು ಕೆಲವು ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಬರುತ್ತವೆ.",
                    hi: "प्रकाशित हो गया। अंग्रेज़ी और हिंदी संस्करण कुछ सेकंड में आ जाएँगे।",
                  })
                : kn.saved,
          );
          setSaveError(result.error ? l(result.error) : "");
          if (result.field) markInvalid(result.field);
          if (result.id) {
            dirty.current = false;
            try {
              sessionStorage.removeItem(recoveryKey);
            } catch {}
            void clearRecovery(recoveryKey).catch(() => {});
            // A new article moves to its own address so the next Save updates it
            // instead of creating a copy; an existing one is already there.
            if (!post?.id) router.replace("/admin/posts/" + result.id);
          }
        } catch {
          setMessage(kn.unavailable);
        } finally {
          setBusy(false);
        }
      }}
    >
      {/* Kept as they were: no longer edited here, but saved so nothing is lost. */}
      <input type="hidden" name="media_images" value={JSON.stringify(post?.media_images || [])} />
      <input type="hidden" name="key_points" value={keyPointsText} />
      <input type="hidden" name="transcript" value={post?.transcript || ""} />
      <input type="hidden" name="summary_points" value="" />

      <div className="post-editor-main">
        <div className="editor-recovery">
          <p role="status">{recovery}</p>
          <button type="button" className="button button-outline" onClick={restoreDraft}>
            {tr({ en: "Restore saved draft", kn: "ಉಳಿಸಿದ ಕರಡು ಪ್ರತಿ ಮರುಸ್ಥಾಪಿಸಿ", hi: "सहेजा गया ड्राफ़्ट बहाल करें" })}
          </button>
        </div>

        <Section
          title={tr({ en: "Article", kn: "ಲೇಖನ", hi: "लेख" })}
          description={tr({
            en: "Write in Kannada. English and Hindi versions are created automatically when you publish.",
            kn: "ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ. ಪ್ರಕಟಿಸಿದಾಗ ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಹಿಂದಿ ಆವೃತ್ತಿಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಿದ್ಧವಾಗುತ್ತವೆ.",
            hi: "कन्नड़ में लिखें। प्रकाशित करने पर अंग्रेज़ी और हिंदी संस्करण अपने-आप बन जाते हैं।",
          })}
        >
          <label className="field wide">
            {tr({ en: "Title (Kannada)", kn: "ಶೀರ್ಷಿಕೆ (ಕನ್ನಡ)", hi: "शीर्षक (कन्नड़)" })}
            <input
              ref={titleRef}
              name="title_kn"
              required
              minLength={3}
              maxLength={110}
              defaultValue={post?.title_kn || ""}
              className="editor-title-input"
              lang="kn"
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <div className="field wide">
            <label htmlFor="post-slug">
              {tr({ en: "Web address (slug)", kn: "ವೆಬ್ ವಿಳಾಸ (ಸ್ಲಗ್)", hi: "वेब पता (स्लग)" })}
            </label>
            <div className="editor-slug-row">
              <input
                id="post-slug"
                name="slug"
                value={slug}
                maxLength={150}
                pattern="[a-z0-9-]*"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
                }}
              />
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  setSlug(slugify(titleRef.current?.value || ""));
                  setSlugTouched(false);
                }}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {tr({ en: "From title", kn: "ಶೀರ್ಷಿಕೆಯಿಂದ", hi: "शीर्षक से" })}
              </button>
            </div>
            <small className="editor-slug-preview">
              {site.url.replace(/^https?:\/\//, "")}/news/<strong>{slug || "…"}</strong>
            </small>
          </div>
          <label className="field">
            {kn.primary}
            <select name="primary_category" required defaultValue={post?.primary_category}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_kn}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {tr({ en: "Place", kn: "ಸ್ಥಳ", hi: "स्थान" })}
            <input
              ref={placeTextRef}
              name="event_place"
              maxLength={150}
              defaultValue={post?.event_place || ""}
              lang="kn"
            />
          </label>
          <PlacePicker
            name="place_id"
            label={tr({ en: "District / town page", kn: "ಜಿಲ್ಲೆ / ಊರಿನ ಪುಟ", hi: "ज़िला / शहर पेज" })}
            places={choices.places}
            value={placeId}
            onChange={(place) => {
              setPlaceId(place?.id || "");
              const text = placeTextRef.current;
              if (place && text && !text.value.trim()) text.value = place.name_kn;
            }}
          />
          <label className="field">
            {tr({ en: "Event date (optional)", kn: "ಕಾರ್ಯಕ್ರಮದ ದಿನಾಂಕ (ಐಚ್ಛಿಕ)", hi: "कार्यक्रम की तारीख़ (वैकल्पिक)" })}
            <input name="event_date" type="date" defaultValue={post?.event_date || ""} />
          </label>
        </Section>

        <Section
          title={tr({ en: "Cover image", kn: "ಮುಖಚಿತ್ರ", hi: "कवर चित्र" })}
          description={tr({
            en: "Shown at the top of the article and on news cards.",
            kn: "ಲೇಖನದ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಮತ್ತು ಸುದ್ದಿ ಕಾರ್ಡ್‌ಗಳಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
            hi: "लेख के ऊपर और समाचार कार्ड पर दिखता है।",
          })}
        >
          <div className="wide editor-stack">
            <label className="field">
              {tr({ en: "Image link", kn: "ಚಿತ್ರದ ಲಿಂಕ್", hi: "चित्र लिंक" })}
              <input
                name="thumbnail_url"
                required
                value={cover}
                placeholder="https://ik.imagekit.io/your-id/photo.jpg"
                onPaste={onCoverPaste}
                onChange={(e) => {
                  setCover(e.target.value);
                  setCoverBroken(false);
                  setCoverNote("");
                }}
                onBlur={(e) => {
                  const next = coverImageUrl(e.target.value);
                  if (next) setCover(next);
                }}
              />
              <small>
                {tr({
                  en: "Paste a YouTube thumbnail link, an ImageKit link, or another cloud image link (.jpg, .png, .webp). Copy image address and paste it here — the picture shows in the preview below.",
                  kn: "YouTube ಥಂಬ್‌ನೇಲ್ ಲಿಂಕ್, ImageKit ಲಿಂಕ್ ಅಥವಾ ಇನ್ನೊಂದು ಕ್ಲೌಡ್ ಚಿತ್ರದ ಲಿಂಕ್ (.jpg, .png, .webp) ಅಂಟಿಸಿ. Copy image address ಮಾಡಿ ಇಲ್ಲಿ ಅಂಟಿಸಿ — ಚಿತ್ರ ಕೆಳಗಿನ ಮುನ್ನೋಟದಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
                  hi: "YouTube थंबनेल लिंक, ImageKit लिंक या कोई और क्लाउड चित्र लिंक (.jpg, .png, .webp) चिपकाएँ। Copy image address करके यहाँ चिपकाएँ — चित्र नीचे पूर्वावलोकन में दिखेगा।",
                })}
              </small>
            </label>
            <figure className="cover-preview" tabIndex={0} onPaste={onCoverPaste}>
              {previewSrc && !coverBroken ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of a pasted image link
                <img
                  src={previewSrc}
                  alt=""
                  onError={() => {
                    if (previewSrc.includes("i.ytimg.com/") && previewSrc.endsWith("/maxresdefault.jpg"))
                      setCover(previewSrc.replace(/\/maxresdefault\.jpg$/, "/hqdefault.jpg"));
                    else setCoverBroken(true);
                  }}
                  onLoad={(e) => {
                    if (
                      e.currentTarget.naturalWidth <= 120 &&
                      previewSrc.includes("i.ytimg.com/") &&
                      previewSrc.endsWith("/maxresdefault.jpg")
                    )
                      setCover(previewSrc.replace(/\/maxresdefault\.jpg$/, "/hqdefault.jpg"));
                  }}
                />
              ) : (
                <p>
                  {coverBroken
                    ? tr({
                        en: "This link did not load as a picture. Check the address and paste it again.",
                        kn: "ಈ ಲಿಂಕ್ ಚಿತ್ರವಾಗಿ ತೆರೆಯಲಿಲ್ಲ. ವಿಳಾಸ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಅಂಟಿಸಿ.",
                        hi: "यह लिंक चित्र की तरह नहीं खुला। पता जाँचकर फिर चिपकाएँ।",
                      })
                    : tr({
                        en: "Thumbnail preview appears here after you paste an image link.",
                        kn: "ಚಿತ್ರದ ಲಿಂಕ್ ಅಂಟಿಸಿದ ಬಳಿಕ ಥಂಬ್‌ನೇಲ್ ಮುನ್ನೋಟ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
                        hi: "चित्र लिंक चिपकाने के बाद थंबनेल पूर्वावलोकन यहाँ दिखेगा।",
                      })}
                </p>
              )}
              <figcaption>{tr({ en: "Thumbnail preview", kn: "ಥಂಬ್‌ನೇಲ್ ಮುನ್ನೋಟ", hi: "थंबनेल पूर्वावलोकन" })}</figcaption>
            </figure>
            {coverNote ? <p className="form-message is-error">{coverNote}</p> : null}
            <label className="field">
              {tr({ en: "Image credit (optional)", kn: "ಚಿತ್ರ ಕೃಪೆ (ಐಚ್ಛಿಕ)", hi: "चित्र श्रेय (वैकल्पिक)" })}
              <input name="image_credit" maxLength={200} defaultValue={post?.image_credit || ""} />
            </label>
          </div>
        </Section>

        <Section
          title={kn.body}
          description={tr({
            en: "The article text. Use the toolbar for headings, lists, tables, links and images.",
            kn: "ಲೇಖನದ ಪಠ್ಯ. ಉಪಶೀರ್ಷಿಕೆ, ಪಟ್ಟಿ, ಕೋಷ್ಟಕ, ಲಿಂಕ್ ಮತ್ತು ಚಿತ್ರಗಳಿಗೆ ಉಪಕರಣ ಪಟ್ಟಿ ಬಳಸಿ.",
            hi: "लेख का पाठ। शीर्षक, सूची, तालिका, लिंक और चित्रों के लिए टूलबार इस्तेमाल करें।",
          })}
        >
          <div className="wide editor-body">
            <div className="editor-toolbar">
              <button type="button" className="icon-button" aria-label={tr({ en: "Bold", kn: "ದಪ್ಪ ಅಕ್ಷರ", hi: "बोल्ड" })} onClick={() => editor?.chain().focus().toggleBold().run()}>
                <Bold size={18} />
              </button>
              <button type="button" className="icon-button" aria-label={tr({ en: "Heading", kn: "ಉಪಶೀರ್ಷಿಕೆ", hi: "शीर्षक" })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 size={18} />
              </button>
              <button type="button" className="icon-button" aria-label={tr({ en: "List", kn: "ಪಟ್ಟಿ", hi: "सूची" })} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <List size={18} />
              </button>
              <span className="editor-toolbar-divider" aria-hidden="true" />
              <button type="button" className="chip" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                {tr({ en: "Italic", kn: "ಓರೆ ಅಕ್ಷರ", hi: "इटैलिक" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
                {tr({ en: "Quote", kn: "ಉಲ್ಲೇಖ", hi: "उद्धरण" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                {tr({ en: "Numbered list", kn: "ಸಂಖ್ಯೆಯ ಪಟ್ಟಿ", hi: "क्रमांकित सूची" })}
              </button>
              <span className="editor-toolbar-divider" aria-hidden="true" />
              <button type="button" className="chip" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                {tr({ en: "Insert table", kn: "ಕೋಷ್ಟಕ ಸೇರಿಸಿ", hi: "तालिका जोड़ें" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().addRowAfter().run()}>
                {tr({ en: "Add row", kn: "ಸಾಲು ಸೇರಿಸಿ", hi: "पंक्ति जोड़ें" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().addColumnAfter().run()}>
                {tr({ en: "Add column", kn: "ಕಾಲಂ ಸೇರಿಸಿ", hi: "कॉलम जोड़ें" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().deleteTable().run()}>
                {tr({ en: "Remove table", kn: "ಕೋಷ್ಟಕ ತೆಗೆದುಹಾಕಿ", hi: "तालिका हटाएँ" })}
              </button>
              <span className="editor-toolbar-divider" aria-hidden="true" />
              <button type="button" className="chip" onClick={() => editor?.chain().focus().undo().run()}>
                {tr({ en: "Undo", kn: "ರದ್ದುಮಾಡಿ", hi: "पूर्ववत करें" })}
              </button>
              <button type="button" className="chip" onClick={() => editor?.chain().focus().redo().run()}>
                {tr({ en: "Redo", kn: "ಮತ್ತೆ ಮಾಡಿ", hi: "फिर से करें" })}
              </button>
            </div>
            <EditorContent editor={editor} />
          </div>

          <details className="wide editor-tools">
            <summary>{tr({ en: "Links and images inside the text", kn: "ಪಠ್ಯದೊಳಗೆ ಲಿಂಕ್ ಮತ್ತು ಚಿತ್ರಗಳು", hi: "पाठ के भीतर लिंक और चित्र" })}</summary>
            <div className="editor-inline-row">
              <label className="field">
                {tr({ en: "Link URL", kn: "ಲಿಂಕ್ URL", hi: "लिंक URL" })}
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </label>
              <button
                type="button"
                className="button button-outline"
                onClick={async () => {
                  if (!editor) return;
                  // An image address shows the picture; a link to it would only show underlined text.
                  const linked = parseImageLink(linkUrl);
                  if (linked) {
                    const { from, to } = editor.state.selection;
                    const selected = editor.state.doc.textBetween(from, to, " ").trim();
                    editor
                      .chain()
                      .focus()
                      .setImage({ src: await bestThumbnail(linked.src), alt: linked.alt || imageAlt || selected })
                      .run();
                    setLinkUrl("");
                    return;
                  }
                  if (/^https?:\/\//.test(linkUrl.trim()))
                    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
                }}
              >
                {linkIsImage
                  ? tr({ en: "Insert as picture", kn: "ಚಿತ್ರವಾಗಿ ಸೇರಿಸಿ", hi: "चित्र के रूप में जोड़ें" })
                  : tr({ en: "Apply to selected text", kn: "ಆಯ್ಕೆಮಾಡಿದ ಪಠ್ಯಕ್ಕೆ ಸೇರಿಸಿ", hi: "चुने गए पाठ पर लगाएँ" })}
              </button>
              <button type="button" className="button button-outline" onClick={() => editor?.chain().focus().unsetLink().run()}>
                {tr({ en: "Remove link", kn: "ಲಿಂಕ್ ತೆಗೆದುಹಾಕಿ", hi: "लिंक हटाएँ" })}
              </button>
            </div>
            {linkIsImage && (
              <div className="image-link-inline-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of the pasted link */}
                <img src={parseImageLink(linkUrl)!.src} alt="" />
                <small>
                  {tr({
                    en: "This is an image address: it is inserted as the picture, not as underlined link text.",
                    kn: "ಇದು ಚಿತ್ರದ ವಿಳಾಸ: ಅಡಿಗೆರೆಯ ಲಿಂಕ್ ಆಗಿ ಅಲ್ಲ, ಚಿತ್ರವಾಗಿಯೇ ಸೇರುತ್ತದೆ.",
                    hi: "यह चित्र का पता है: रेखांकित लिंक नहीं, चित्र के रूप में जुड़ेगा।",
                  })}
                </small>
              </div>
            )}
            <label className="field">
              {tr({ en: "Image description", kn: "ಚಿತ್ರದ ವಿವರಣೆ", hi: "चित्र का विवरण" })}
              <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} maxLength={300} />
            </label>
            <div className="editor-inline-row">
              <label className="field">
                {tr({
                  en: "Image link (ImageKit or YouTube) or Markdown ![alt](url)",
                  kn: "ಚಿತ್ರದ ಲಿಂಕ್ (ImageKit ಅಥವಾ YouTube) ಅಥವಾ Markdown ![alt](url)",
                  hi: "चित्र लिंक (ImageKit या YouTube) या Markdown ![alt](url)",
                })}
                <input
                  value={imageLink}
                  placeholder="https://ik.imagekit.io/your-id/photo.jpg  ·  https://img.youtube.com/vi/…/maxresdefault.jpg"
                  onChange={(e) => {
                    setImageLink(e.target.value);
                    setImageLinkError("");
                  }}
                />
              </label>
              <button
                type="button"
                className="button button-outline"
                onClick={async () => {
                  const image = parseImageLink(imageLink);
                  if (!image) {
                    setImageLinkError(
                      tr({
                        en: "Use an ImageKit link (https://ik.imagekit.io/…), a YouTube thumbnail or video link, or an /images/ path.",
                        kn: "ImageKit ಲಿಂಕ್ (https://ik.imagekit.io/…), YouTube ಥಂಬ್‌ನೇಲ್ ಅಥವಾ ವಿಡಿಯೋ ಲಿಂಕ್, ಅಥವಾ /images/ ವಿಳಾಸ ಬಳಸಿ.",
                        hi: "ImageKit लिंक (https://ik.imagekit.io/…), YouTube थंबनेल या वीडियो लिंक, या /images/ पथ इस्तेमाल करें।",
                      }),
                    );
                    return;
                  }
                  editor?.chain().focus().setImage({ src: await bestThumbnail(image.src), alt: image.alt || imageAlt }).run();
                  setImageLink("");
                }}
              >
                {tr({ en: "Insert image from link", kn: "ಲಿಂಕ್‌ನಿಂದ ಚಿತ್ರ ಸೇರಿಸಿ", hi: "लिंक से चित्र जोड़ें" })}
              </button>
            </div>
            {imagePreview && (
              <div className="image-link-inline-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of the pasted link */}
                <img src={imagePreview} alt="" />
              </div>
            )}
            {imageLinkError && (
              <p role="alert" className="form-message">
                {imageLinkError}
              </p>
            )}
          </details>
        </Section>

        <Section
          title={tr({ en: "Video", kn: "ವಿಡಿಯೋ", hi: "वीडियो" })}
          description={tr({
            en: "Optional. Shown at the bottom of the article, after the text.",
            kn: "ಐಚ್ಛಿಕ. ಲೇಖನದ ಕೆಳಭಾಗದಲ್ಲಿ, ಪಠ್ಯದ ನಂತರ ಕಾಣಿಸುತ್ತದೆ.",
            hi: "वैकल्पिक। लेख के नीचे, पाठ के बाद दिखता है।",
          })}
        >
          <label className="field wide">
            {tr({ en: "YouTube / Facebook link or embed code", kn: "YouTube / Facebook ಲಿಂಕ್ ಅಥವಾ ಎಂಬೆಡ್ ಕೋಡ್", hi: "YouTube / Facebook लिंक या एम्बेड कोड" })}
            <textarea
              name="video_url"
              rows={2}
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              aria-invalid={videoInput.trim() && !video ? true : undefined}
              placeholder={'https://www.youtube.com/watch?v=…   or   <iframe src="https://www.facebook.com/plugins/video.php?href=…"></iframe>'}
            />
            {!videoInput.trim() ? (
              <small className="video-source-hint">
                <span className="video-source">
                  <YouTubeLogo size={13} /> YouTube
                </span>
                <span className="video-source">
                  <FacebookLogo size={15} /> Facebook
                </span>
                {tr({
                  en: "Paste the video link, or the <iframe> code from the video's Share → Embed option.",
                  kn: "ವಿಡಿಯೋ ಲಿಂಕ್ ಅಥವಾ ವಿಡಿಯೋದ Share → Embed ಆಯ್ಕೆಯ <iframe> ಕೋಡ್ ಅಂಟಿಸಿ.",
                  hi: "वीडियो लिंक, या वीडियो के Share → Embed विकल्प का <iframe> कोड चिपकाएँ।",
                })}
              </small>
            ) : video ? (
              <small className={"video-detected is-" + video.provider}>
                {video.provider === "facebook" ? <FacebookLogo size={16} /> : <YouTubeLogo size={14} />}
                <strong>
                  {video.provider === "facebook"
                    ? tr({ en: "Facebook video found", kn: "Facebook ವಿಡಿಯೋ ಸಿಕ್ಕಿದೆ", hi: "Facebook वीडियो मिला" })
                    : tr({ en: "YouTube video found", kn: "YouTube ವಿಡಿಯೋ ಸಿಕ್ಕಿದೆ", hi: "YouTube वीडियो मिला" })}
                </strong>
                <a href={video.url} target="_blank" rel="noopener noreferrer">
                  {tr({ en: "Open to check", kn: "ತೆರೆದು ಪರಿಶೀಲಿಸಿ", hi: "खोलकर जाँचें" })}
                </a>
              </small>
            ) : (
              <small className="video-detected is-error" role="alert">
                {tr({
                  en: "This is not a YouTube or Facebook video link. Paste the video's own link, or the <iframe> code from Share → Embed.",
                  kn: "ಇದು YouTube ಅಥವಾ Facebook ವಿಡಿಯೋ ಲಿಂಕ್ ಅಲ್ಲ. ವಿಡಿಯೋದ ಲಿಂಕ್ ಅಥವಾ Share → Embed ನಲ್ಲಿನ <iframe> ಕೋಡ್ ಅಂಟಿಸಿ.",
                  hi: "यह YouTube या Facebook वीडियो लिंक नहीं है। वीडियो का लिंक, या Share → Embed से <iframe> कोड चिपकाएँ।",
                })}
              </small>
            )}
          </label>
        </Section>

        <Section
          title={tr({ en: "SEO (Google search)", kn: "SEO (Google ಹುಡುಕಾಟ)", hi: "SEO (Google सर्च)" })}
          description={tr({
            en: "Optional. Added to the page header for search engines and social shares. Left blank, the title and opening text are used.",
            kn: "ಐಚ್ಛಿಕ. ಹುಡುಕಾಟ ಮತ್ತು ಹಂಚಿಕೆಗಾಗಿ ಪುಟದ ಹೆಡರ್‌ಗೆ ಸೇರಿಸಲಾಗುತ್ತದೆ. ಖಾಲಿ ಬಿಟ್ಟರೆ ಶೀರ್ಷಿಕೆ ಮತ್ತು ಆರಂಭದ ಪಠ್ಯ ಬಳಸಲಾಗುತ್ತದೆ.",
            hi: "वैकल्पिक। सर्च इंजन और सोशल शेयर के लिए पेज हेडर में जोड़ा जाता है। खाली छोड़ने पर शीर्षक और शुरुआती पाठ इस्तेमाल होता है।",
          })}
        >
          <label className="field wide">
            {tr({ en: "SEO title", kn: "SEO ಶೀರ್ಷಿಕೆ", hi: "SEO शीर्षक" })}
            <input name="seo_title" maxLength={110} defaultValue={post?.seo_title || ""} />
          </label>
          <label className="field wide">
            {tr({ en: "SEO description", kn: "SEO ವಿವರಣೆ", hi: "SEO विवरण" })}
            <textarea name="seo_description" maxLength={300} rows={3} defaultValue={post?.seo_description || ""} />
          </label>
          <label className="field wide">
            {tr({ en: "SEO keywords", kn: "SEO ಪದಗಳು", hi: "SEO कीवर्ड" })}
            <input
              name="seo_keywords"
              maxLength={500}
              defaultValue={post?.seo_keywords || ""}
              placeholder={tr({ en: "Jain news, Shravanabelagola, Basadi", kn: "ಜೈನ ಸುದ್ದಿ, ಶ್ರವಣಬೆಳಗೊಳ, ಬಸದಿ", hi: "जैन समाचार, श्रवणबेलगोला, बसदि" })}
            />
            <small>{tr({ en: "Separate keywords with commas.", kn: "ಪದಗಳನ್ನು ಅಲ್ಪವಿರಾಮದಿಂದ ಬೇರ್ಪಡಿಸಿ.", hi: "कीवर्ड को कॉमा से अलग करें।" })}</small>
          </label>
        </Section>
      </div>

      <aside className="post-editor-side">
        <section className="editor-section editor-publish">
          <header>
            <h2>{tr({ en: "Publish", kn: "ಪ್ರಕಟಣೆ", hi: "प्रकाशन" })}</h2>
          </header>
          <div className="editor-stack">
            <label className="field">
              {kn.status}
              <select name="status" defaultValue={post?.status || "draft"}>
                <option value="draft">{kn.draft}</option>
                {canPublish && (
                  <>
                    <option value="published">{kn.publishedStatus}</option>
                    <option value="scheduled">{tr({ en: "Scheduled", kn: "ನಿಗದಿಪಡಿಸಲಾಗಿದೆ", hi: "निर्धारित" })}</option>
                  </>
                )}
              </select>
            </label>
            <label className="field">
              {tr({ en: "Publish at (only when scheduled)", kn: "ಪ್ರಕಟಣೆ ಸಮಯ (ನಿಗದಿಪಡಿಸಿದಾಗ ಮಾತ್ರ)", hi: "प्रकाशन समय (केवल निर्धारित होने पर)" })}
              <input type="datetime-local" name="scheduled_for" defaultValue={istInput(post?.scheduled_for)} />
            </label>
            <details>
              <summary>{tr({ en: "More timing options", kn: "ಇನ್ನಷ್ಟು ಸಮಯದ ಆಯ್ಕೆಗಳು", hi: "और समय विकल्प" })}</summary>
              <div className="editor-stack">
                <label className="field">
                  {t.embargo}
                  <input name="embargo_until" type="datetime-local" defaultValue={istInput(post?.embargo_until)} />
                </label>
                <label className="field">
                  {tr({ en: "Early access ends (IST)", kn: "ಮುಂಗಡ ಪ್ರವೇಶ ಮುಕ್ತಾಯ (IST)", hi: "अर्ली एक्सेस की समाप्ति (IST)" })}
                  <input name="early_access_until" type="datetime-local" defaultValue={istInput(post?.early_access_until)} />
                </label>
                <label className="field">
                  {tr({ en: "Breaking news ends (IST)", kn: "ಬ್ರೇಕಿಂಗ್ ಸುದ್ದಿ ಮುಕ್ತಾಯ (IST)", hi: "ब्रेकिंग न्यूज़ की समाप्ति (IST)" })}
                  <input type="datetime-local" name="breaking_until" defaultValue={istInput(post?.breaking_until)} />
                </label>
              </div>
            </details>
            <p className="editor-translate-note">
              <Languages size={16} aria-hidden="true" />
              {tr({
                en: "English and Hindi are translated automatically when you publish.",
                kn: "ಪ್ರಕಟಿಸಿದಾಗ ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಹಿಂದಿ ಅನುವಾದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಆಗುತ್ತದೆ.",
                hi: "प्रकाशित करने पर अंग्रेज़ी और हिंदी अनुवाद अपने-आप हो जाता है।",
              })}
            </p>
            <div className="editor-save">
              <button className="button button-ember" disabled={busy}>
                <Save size={16} aria-hidden="true" />
                {busy ? tr({ en: "Saving…", kn: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…", hi: "सहेजा जा रहा है…" }) : kn.save}
              </button>
              <p role="status" className={"form-message" + (saveError ? " is-error" : "")}>
                {message}
              </p>
            </div>
            {post?.id && (
              <div className="editor-manage">
                {post.status === "published" && (
                  <a
                    href={`${site.url}/news/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-outline"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    {tr({ en: "View on site", kn: "ಸೈಟ್‌ನಲ್ಲಿ ನೋಡಿ", hi: "साइट पर देखें" })}
                  </a>
                )}
                {post.deleted_at ? <RestorePostButton postId={post.id} title={post.title_kn} /> : null}
                {canDelete && (
                  <DeletePostButton
                    postId={post.id}
                    title={post.title_kn}
                    mode={post.deleted_at ? "forever" : "bin"}
                    afterDelete="bin"
                  />
                )}
              </div>
            )}
          </div>
        </section>

        <section className="editor-section">
          <header>
            <h2>{tr({ en: "Options", kn: "ಆಯ್ಕೆಗಳು", hi: "विकल्प" })}</h2>
          </header>
          <div className="editor-stack">
            <div className="editor-toggles">
              {(
                [
                  ["is_featured", { en: "Featured report (home page banner)", kn: "ವಿಶೇಷ ವರದಿ (ಮುಖಪುಟ ಬ್ಯಾನರ್)", hi: "विशेष रिपोर्ट (होम पेज बैनर)" }],
                  ["is_breaking", { en: "Breaking news", kn: "ಬ್ರೇಕಿಂಗ್ ಸುದ್ದಿ", hi: "ब्रेकिंग न्यूज़" }],
                  ["is_live", { en: "Live", kn: "ನೇರಪ್ರಸಾರ", hi: "लाइव" }],
                  ["allow_comments", { en: "Allow comments", kn: "ಅಭಿಪ್ರಾಯಗಳಿಗೆ ಅವಕಾಶ", hi: "टिप्पणियों की अनुमति" }],
                ] as const
              ).map(([name, label]) => (
                <label key={name}>
                  <input type="checkbox" name={name} defaultChecked={post?.[name]} />
                  {tr(label)}
                </label>
              ))}
              <label>
                <input type="checkbox" name="audio_enabled" defaultChecked={post?.audio_enabled !== false} />
                {tr({ en: "Audio version of the article", kn: "ಲೇಖನದ ಧ್ವನಿ ಆವೃತ್ತಿ", hi: "लेख का ऑडियो संस्करण" })}
              </label>
              <label>
                <input type="checkbox" name="hide_ads" defaultChecked={post?.hide_ads} />
                {t.hideAds}
              </label>
              <label>
                <input type="checkbox" name="meaningful_edit" />
                {t.meaningfulEdit}
              </label>
            </div>
            <label className="field">
              {t.contentType}
              <select name="type" defaultValue={post?.type || "article"}>
                <option value="article">{tr({ en: "Article (video below the text)", kn: "ಲೇಖನ (ಪಠ್ಯದ ಕೆಳಗೆ ವಿಡಿಯೋ)", hi: "लेख (पाठ के नीचे वीडियो)" })}</option>
                <option value="video">{tr({ en: "Video story", kn: "ವಿಡಿಯೋ ಸುದ್ದಿ", hi: "वीडियो स्टोरी" })}</option>
                <option value="short">{tr({ en: "Short video", kn: "ಕಿರು ವಿಡಿಯೋ", hi: "छोटा वीडियो" })}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="editor-section">
          <header>
            <h2>{tr({ en: "Organise", kn: "ವರ್ಗೀಕರಣ", hi: "व्यवस्थित करें" })}</h2>
          </header>
          <div className="editor-stack">
            <fieldset className="editor-checklist-box">
              <legend>{tr({ en: "Also show in", kn: "ಇವುಗಳಲ್ಲೂ ತೋರಿಸಿ", hi: "इनमें भी दिखाएँ" })}</legend>
              <div className="editor-scroll-list">
                {categories.map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" name="category_ids" value={c.id} defaultChecked={post?.category_slugs.includes(c.slug)} />
                    {c.name_kn}
                  </label>
                ))}
              </div>
            </fieldset>
            {choices.tags.length > 0 && (
              <fieldset className="editor-checklist-box">
                <legend>{t.tags}</legend>
                <div className="editor-scroll-list">
                  {choices.tags.map((tag) => (
                    <label key={tag.id}>
                      <input type="checkbox" name="tag_ids" value={tag.id} defaultChecked={post?.tag_ids?.includes(tag.id)} />
                      {tag.name_kn}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {(
              [
                ["public_author_id", { en: "Author", kn: "ಲೇಖಕ", hi: "लेखक" }, choices.authors],
                ["event_id", { en: "Related event", kn: "ಸಂಬಂಧಿತ ಕಾರ್ಯಕ್ರಮ", hi: "संबंधित कार्यक्रम" }, choices.events],
              ] as const
            ).map(([name, label, options]) => (
              <label className="field" key={name}>
                {tr(label)}
                <select name={name} defaultValue={post?.[name] || ""}>
                  <option value="">{t.select}</option>
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_kn}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="editor-sponsor">
              <label className="editor-switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={sponsored}
                  aria-checked={sponsored}
                  onChange={(e) => setSponsored(e.target.checked)}
                />
                <span>{tr({ en: "Sponsored article", kn: "ಪ್ರಾಯೋಜಿತ ಲೇಖನ", hi: "प्रायोजित लेख" })}</span>
              </label>
              {sponsored ? (
                <label className="field">
                  {tr({ en: "Sponsor name", kn: "ಪ್ರಾಯೋಜಕರ ಹೆಸರು", hi: "प्रायोजक का नाम" })}
                  <input
                    name="sponsor_name"
                    maxLength={150}
                    required
                    autoComplete="off"
                    defaultValue={post?.sponsor_name || ""}
                  />
                  <small>
                    {tr({
                      en: "Paid articles need the advertiser's approval before they can be published: save as Draft, then use \"Prepare review link\" below the editor.",
                      kn: "ಹಣ ಪಡೆದ ಲೇಖನಗಳು ಪ್ರಕಟವಾಗಲು ಜಾಹೀರಾತುದಾರರ ಅನುಮೋದನೆ ಬೇಕು: ಕರಡು ಆಗಿ ಉಳಿಸಿ, ನಂತರ ಸಂಪಾದಕದ ಕೆಳಗಿನ \"ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧಪಡಿಸಿ\" ಬಳಸಿ.",
                      hi: "भुगतान वाले लेखों को प्रकाशित करने से पहले विज्ञापनदाता की स्वीकृति चाहिए: ड्राफ़्ट के रूप में सहेजें, फिर संपादक के नीचे \"समीक्षा लिंक तैयार करें\" इस्तेमाल करें।",
                    })}
                  </small>
                </label>
              ) : (
                <>
                  <input type="hidden" name="sponsor_name" value="" />
                  <small>
                    {tr({
                      en: "Off: a normal article, published straight away.",
                      kn: "ಆಫ್: ಸಾಮಾನ್ಯ ಲೇಖನ, ತಕ್ಷಣ ಪ್ರಕಟವಾಗುತ್ತದೆ.",
                      hi: "बंद: सामान्य लेख, तुरंत प्रकाशित होता है।",
                    })}
                  </small>
                </>
              )}
            </div>
          </div>
        </section>
      </aside>
      {saveError && (
        <div className="editor-error-toast" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <p>{saveError}</p>
          <button
            type="button"
            aria-label={tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद करें" })}
            onClick={() => setSaveError("")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </form>
  );
}
