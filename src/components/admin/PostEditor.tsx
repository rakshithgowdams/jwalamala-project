"use client";
import {
  saveRecovery,
  loadRecovery,
  clearRecovery,
} from "@/app/admin/recovery/actions";
import { SeoHelper } from "@/components/admin/v4/SeoHelper";
import { ImageUpload } from "@/components/admin/v4/ImageUpload";
import { AiAssistant } from "@/components/admin/v4/AiAssistant";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import TiptapImage from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { Bold, List, Heading2 } from "lucide-react";
import type { Category, Post } from "@/lib/types";
import { kn, v4 as t } from "@/content/strings.kn";
import { savePost } from "@/app/admin/actions";
export function PostEditor({
  post,
  categories,
  canPublish,
  choices,
}: {
  post?: Post;
  categories: Category[];
  canPublish: boolean;
  choices: {
    tags: { id: string; name_kn: string }[];
    places: { id: string; name_kn: string }[];
    authors: { id: string; name_kn: string }[];
    events: { id: string; name_kn: string }[];
  };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState(""),
    [imageAlt, setImageAlt] = useState("");
  const [media, setMedia] = useState(post?.media_images || []);
  const formRef = useRef<HTMLFormElement>(null);
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
          JSON.stringify({
            fields: Array.from(data.entries()),
            body: editor?.getJSON(),
          }),
        );
        const saved = await saveRecovery({
          key: recoveryKey,
          postId: post?.id,
          snapshot: {
            fields: Array.from(data.entries()).filter(
              (entry) => typeof entry[1] === "string",
            ),
            body: editor?.getJSON(),
          },
        });
        setRecovery(
          saved.error
            ? "ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಕರಡು ಪ್ರತಿ ಉಳಿಸಲಾಗಿದೆ."
            : "ಕರಡು ಪ್ರತಿ ಖಾತೆಯಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.",
        );
      } catch {}
    }, 30000);
    return () => {
      window.removeEventListener("beforeunload", guard);
      window.clearInterval(timer);
    };
  });
  return (
    <form
      ref={formRef}
      onChange={() => {
        dirty.current = true;
      }}
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!editor) return;
        setBusy(true);
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
          setMessage(result.error || kn.saved);
          if (result.id) {
            dirty.current = false;
            try {
              sessionStorage.removeItem(recoveryKey);
            } catch {}
            await clearRecovery(recoveryKey).catch(() => {});
            router.push("/admin/posts/" + result.id);
          }
        } catch {
          setMessage(kn.unavailable);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="wide">
        <p role="status">{recovery}</p>
        <button
          type="button"
          className="button button-outline"
          onClick={async () => {
            try {
              const draft =
                JSON.parse(sessionStorage.getItem(recoveryKey) || "null") ||
                (await loadRecovery(recoveryKey))?.snapshot;
              if (!draft) {
                setRecovery("ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಉಳಿಸಿದ ಪ್ರತಿ ಇಲ್ಲ.");
                return;
              }
              for (const element of Array.from(
                formRef.current?.elements || [],
              )) {
                if (
                  element instanceof HTMLInputElement ||
                  element instanceof HTMLTextAreaElement ||
                  element instanceof HTMLSelectElement
                ) {
                  const values = draft.fields
                    .filter((entry: string[]) => entry[0] === element.name)
                    .map((entry: string[]) => entry[1]);
                  if (
                    element instanceof HTMLInputElement &&
                    element.type === "checkbox"
                  )
                    element.checked = values.includes(element.value);
                  else if (values.length) element.value = values[0];
                }
              }
              if (draft.body) editor?.commands.setContent(draft.body);
              dirty.current = true;
              setRecovery("ಕರಡು ಪ್ರತಿ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ. ಪರಿಶೀಲಿಸಿ ಉಳಿಸಿ.");
            } catch {
              setRecovery("ಕರಡು ಪ್ರತಿ ಓದಲಾಗಲಿಲ್ಲ.");
            }
          }}
        >
          ಉಳಿಸಿದ ಕರಡು ಪ್ರತಿ ಮರುಸ್ಥಾಪಿಸಿ
        </button>
      </div>
      {[
        [kn.title, "title_kn"],
        ["English title", "title_en"],
        [kn.slug, "slug"],
        [kn.eventDate, "event_date"],
        [kn.place, "event_place"],
        [kn.videoUrl, "video_url"],
      ].map(([label, name]) => (
        <label className="field" key={name}>
          {label}
          <input
            name={name}
            required={["title_kn", "slug", "event_date"].includes(name)}
            type={
              name === "event_date"
                ? "date"
                : name === "video_url"
                  ? "url"
                  : "text"
            }
            defaultValue={String(post?.[name as keyof Post] || "")}
          />
        </label>
      ))}
      <details className="wide">
        <summary>Reviewed English version</summary>
        <label className="field">
          English summary
          <textarea
            name="summary_en"
            maxLength={1000}
            defaultValue={post?.summary_en || ""}
          />
        </label>
        <label className="field">
          English article HTML
          <textarea
            name="body_en"
            rows={10}
            maxLength={200000}
            defaultValue={post?.body_en || ""}
          />
        </label>
        <p className="meta">
          The English version is available when both the English title and
          article are filled. Review translated text before publishing.
        </p>
      </details>
      <details className="wide">
        <summary>Reviewed Hindi version</summary>
        <label className="field">
          Hindi title
          <input name="title_hi" defaultValue={post?.title_hi || ""} />
        </label>
        <label className="field">
          Hindi summary
          <textarea
            name="summary_hi"
            maxLength={1000}
            defaultValue={post?.summary_hi || ""}
          />
        </label>
        <label className="field">
          Hindi article HTML
          <textarea
            name="body_hi"
            rows={10}
            maxLength={200000}
            defaultValue={post?.body_hi || ""}
          />
        </label>
        <p className="meta">
          The Hindi version is available when both the Hindi title and article
          are filled. Review translated text before publishing.
        </p>
      </details>
      <p className="notice wide">{t.publishChecklist}</p>
      <SeoHelper form={formRef} />
      <label className="field">
        Content type
        <select name="type" defaultValue={post?.type || "article"}>
          <option value="article">Article</option>
          <option value="video">Video</option>
          <option value="short">Short video</option>
        </select>
      </label>
      <AiAssistant
        postId={post?.id}
        getText={() => editor?.getText() || ""}
        getCategoryIds={() =>
          formRef.current
            ? new FormData(formRef.current).getAll("category_ids").map(String)
            : []
        }
        onAccept={(field, value) => {
          const mapped = field.includes("summary")
            ? "summary_points"
            : field.includes("headline")
              ? "title_kn"
              : field;
          if (["tag_ids", "category_ids"].includes(mapped)) {
            try {
              const ids = JSON.parse(value);
              if (!Array.isArray(ids)) throw Error();
              for (const input of Array.from(
                formRef.current?.querySelectorAll<HTMLInputElement>(
                  `input[name="${mapped}"]`,
                ) || [],
              ))
                input.checked = ids.includes(input.value);
              dirty.current = true;
            } catch {
              setMessage(
                "Review these taxonomy suggestions manually: " + value,
              );
            }
            return;
          }
          const element = formRef.current?.elements.namedItem(mapped);
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
          ) {
            element.value =
              mapped === "summary_points"
                ? [element.value, value].filter(Boolean).join("\n")
                : value;
            dirty.current = true;
            element.dispatchEvent(new Event("input", { bubbles: true }));
          } else setMessage(value);
        }}
      />
      <label className="field wide">
        Video chapters · MM:SS title
        <textarea
          name="key_points"
          rows={4}
          placeholder="00:00 ಪರಿಚಯ"
          defaultValue={(post?.key_points || [])
            .sort((a, b) => a.seconds - b.seconds)
            .map(
              (p) =>
                Math.floor(p.seconds / 60) +
                ":" +
                String(p.seconds % 60).padStart(2, "0") +
                " " +
                p.label_kn,
            )
            .join("\n")}
        />
      </label>
      <label className="field wide">
        {kn.summary}
        <textarea
          name="summary_kn"
          defaultValue={post?.summary_kn}
          maxLength={1000}
        />
      </label>
      <label className="field">
        {t.credit}
        <input
          name="image_credit"
          maxLength={200}
          defaultValue={post?.image_credit || ""}
        />
      </label>
      <label className="field">
        {t.embargo}
        <input
          name="embargo_until"
          type="datetime-local"
          defaultValue={
            post?.embargo_until
              ? new Date(Date.parse(post.embargo_until) + 19800000)
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
        />
      </label>
      <label className="field wide">
        {t.quickSummary}
        <textarea
          name="summary_points"
          rows={4}
          defaultValue={post?.summary_points?.join("\n") || ""}
        />
      </label>
      <label className="chip">
        <input
          type="checkbox"
          name="hide_ads"
          defaultChecked={post?.hide_ads}
        />
        {t.hideAds}
      </label>
      <label className="chip">
        <input type="checkbox" name="meaningful_edit" />
        {t.meaningfulEdit}
      </label>
      <div className="field wide">
        <label>{kn.body}</label>
        <div className="editor-toolbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Heading"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="List"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List size={18} />
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            Quote
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            Numbered list
          </button>
          <button
            type="button"
            className="chip"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            Insert table
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            Add row
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            Add column
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            Remove table
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            Undo
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            Redo
          </button>
        </div>
        <div className="public-filter">
          <label className="field">
            Link URL
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="chip"
            onClick={() => {
              if (/^https?:\/\//.test(linkUrl))
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: linkUrl })
                  .run();
            }}
          >
            Apply link to selected text
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => editor?.chain().focus().unsetLink().run()}
          >
            Remove link
          </button>
        </div>
        <label className="field">
          Image description
          <input
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            maxLength={300}
          />
        </label>
        <ImageUpload
          onUploaded={(url) =>
            editor?.chain().focus().setImage({ src: url, alt: imageAlt }).run()
          }
        />
        <EditorContent editor={editor} />
      </div>
      <fieldset className="field wide">
        <legend>{kn.categories}</legend>
        <div className="category-chips" style={{ flexWrap: "wrap" }}>
          {categories.map((c) => (
            <label className="chip" key={c.id}>
              <input
                style={{ width: 18, minHeight: 18, marginRight: 8 }}
                type="checkbox"
                name="category_ids"
                value={c.id}
                defaultChecked={post?.category_slugs.includes(c.slug)}
              />
              {c.name_kn}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="wide">
        <ImageUpload
          onUploaded={(url) => {
            const input = formRef.current?.elements.namedItem("thumbnail_url");
            if (input instanceof HTMLInputElement) {
              input.value = url;
              dirty.current = true;
            }
          }}
        />
      </div>
      <label className="field wide">
        ಮುಖಪುಟ ಚಿತ್ರ URL
        <input
          name="thumbnail_url"
          required
          defaultValue={post?.thumbnail_url || "/images/jwalamala-logo.jpg"}
        />
        <small>ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಚಿತ್ರ ಅಥವಾ /images/ ವಿಳಾಸ.</small>
      </label>
      {(
        [
          ["public_author_id", "ಲೇಖಕ", choices.authors],
          ["place_id", "ಸ್ಥಳ", choices.places],
          ["event_id", "ಸಂಬಂಧಿತ ಕಾರ್ಯಕ್ರಮ", choices.events],
        ] as const
      ).map(([name, label, options]) => (
        <label className="field" key={name}>
          {label}
          <select name={name} defaultValue={post?.[name] || ""}>
            <option value="">ಆಯ್ಕೆಮಾಡಿ</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name_kn}
              </option>
            ))}
          </select>
        </label>
      ))}
      <fieldset className="field wide">
        <legend>ಟ್ಯಾಗ್‌ಗಳು</legend>
        <div className="category-chips">
          {choices.tags.map((tag) => (
            <label className="chip" key={tag.id}>
              <input
                type="checkbox"
                name="tag_ids"
                value={tag.id}
                defaultChecked={post?.tag_ids?.includes(tag.id)}
              />
              {tag.name_kn}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field wide">
        <legend>ಚಿತ್ರ ವಿನ್ಯಾಸ (1–3 ಚಿತ್ರಗಳು)</legend>
        <input
          type="hidden"
          name="media_images"
          value={JSON.stringify(media)}
        />
        {media.map((image, index) => (
          <div className="form-grid" key={index}>
            <label className="field">
              ಚಿತ್ರ URL
              <input
                value={image.url}
                onChange={(e) => {
                  setMedia(
                    media.map((m, i) =>
                      i === index ? { ...m, url: e.target.value } : m,
                    ),
                  );
                  dirty.current = true;
                }}
              />
            </label>
            <label className="field">
              ಚಿತ್ರ ಕೃಪೆ
              <input
                required
                value={image.credit}
                onChange={(e) => {
                  setMedia(
                    media.map((m, i) =>
                      i === index ? { ...m, credit: e.target.value } : m,
                    ),
                  );
                  dirty.current = true;
                }}
              />
            </label>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setMedia(media.filter((_, i) => i !== index));
                dirty.current = true;
              }}
            >
              ತೆಗೆದುಹಾಕಿ
            </button>
          </div>
        ))}
        {media.length < 3 && (
          <ImageUpload
            onUploaded={(url) => {
              setMedia([...media, { url, credit: "" }]);
              dirty.current = true;
            }}
          />
        )}
      </fieldset>
      <label className="field">
        ಮುಂಗಡ ಪ್ರವೇಶ ಮುಕ್ತಾಯ (IST)
        <input
          name="early_access_until"
          type="datetime-local"
          defaultValue={
            post?.early_access_until
              ? new Date(Date.parse(post.early_access_until) + 19800000)
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
        />
      </label>
      <label className="chip">
        <input
          type="checkbox"
          name="audio_enabled"
          defaultChecked={post?.audio_enabled !== false}
        />
        ಲೇಖನದ ಧ್ವನಿ ಆವೃತ್ತಿ
      </label>
      <label className="field wide">
        ಪ್ರತಿಲಿಪಿ
        <textarea
          name="transcript"
          rows={5}
          defaultValue={post?.transcript || ""}
        />
      </label>
      <label className="field">
        SEO ಶೀರ್ಷಿಕೆ
        <input
          name="seo_title"
          maxLength={110}
          defaultValue={post?.seo_title || ""}
        />
      </label>
      <label className="field">
        SEO ವಿವರಣೆ
        <textarea
          name="seo_description"
          maxLength={300}
          defaultValue={post?.seo_description || ""}
        />
      </label>
      <label className="field">
        ಪ್ರಾಯೋಜಕರ ಹೆಸರು
        <input
          name="sponsor_name"
          maxLength={150}
          defaultValue={post?.sponsor_name || ""}
        />
      </label>
      <label className="field">
        ಬ್ರೇಕಿಂಗ್ ಸುದ್ದಿ ಮುಕ್ತಾಯ (IST)
        <input
          type="datetime-local"
          name="breaking_until"
          defaultValue={
            post?.breaking_until
              ? new Date(Date.parse(post.breaking_until) + 19800000)
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
        />
      </label>
      {(
        [
          ["is_featured", "ವಿಶೇಷ ವರದಿ"],
          ["is_breaking", "ಬ್ರೇಕಿಂಗ್ ಸುದ್ದಿ"],
          ["is_live", "ನೇರಪ್ರಸಾರ"],
          ["allow_comments", "ಅಭಿಪ್ರಾಯಗಳಿಗೆ ಅವಕಾಶ"],
        ] as const
      ).map(([name, label]) => (
        <label className="chip" key={name}>
          <input type="checkbox" name={name} defaultChecked={post?.[name]} />
          {label}
        </label>
      ))}
      <label className="field">
        {kn.primary}
        <select
          name="primary_category"
          required
          defaultValue={post?.primary_category}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {kn.status}
        <select name="status" defaultValue={post?.status || "draft"}>
          <option value="draft">{kn.draft}</option>
          {canPublish && (
            <>
              <option value="published">{kn.publishedStatus}</option>
              <option value="scheduled">ನಿಗದಿಪಡಿಸಲಾಗಿದೆ</option>
            </>
          )}
        </select>
      </label>
      <label className="field">
        {kn.published}
        <input
          type="datetime-local"
          name="scheduled_for"
          defaultValue={
            post?.scheduled_for
              ? new Date(Date.parse(post.scheduled_for) + 19800000)
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
        />
      </label>
      <div className="field wide">
        <button className="button button-ember" disabled={busy}>
          {kn.save}
        </button>
        <p role="status" className="form-message">
          {message}
        </p>
      </div>
    </form>
  );
}
