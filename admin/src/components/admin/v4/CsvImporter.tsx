"use client";
import { useState } from "react";
import {
  parseCsv,
  importFields,
  mapImportRow,
  importRowSchema,
} from "@/lib/v4/import";
import { toCsv } from "@/lib/v4/csv";
import { beginImport, importBatch } from "@/app/admin/import/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function CsvImporter({
  categories,
}: {
  categories: { id: string; name_kn: string }[];
}) {
  const { tr } = useUiStrings();
  const errorText = tr({ en: "Error", kn: "ದೋಷ", hi: "त्रुटि" });
  const [rows, setRows] = useState<Record<string, string>[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [category, setCategory] = useState(categories[0]?.id || ""),
    [name, setName] = useState(""),
    [job, setJob] = useState(""),
    [results, setResults] = useState<
      { row: number; result: string; message: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const headers = Object.keys(rows[0] || {});
  function download() {
    const blob = new Blob(
        ["\uFEFF" + toCsv(results, ["row", "result", "message"])],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "import-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function run() {
    setBusy(true);
    setMessage("");
    try {
      let id = job;
      if (!id) {
        const begun = await beginImport(name, rows.length);
        if (!begun.id) {
          setMessage(begun.error || errorText);
          return;
        }
        id = begun.id;
        setJob(id);
      }
      let collected = [...results];
      for (let offset = 0; offset < rows.length; offset += 10) {
        const batch = await importBatch(
          id,
          category,
          rows.slice(offset, offset + 10).map((row, i) => ({
            number: offset + i + 1,
            data: mapImportRow(row, mapping),
          })),
        );
        if (batch.results) {
          for (const item of batch.results)
            collected = [...collected.filter((r) => r.row !== item.row), item];
          setResults([...collected]);
        }
        if (batch.error) {
          setMessage(batch.error);
          return;
        }
      }
      setMessage(
        tr({
          en: "Import complete. Review the drafts before publishing.",
          kn: "ಆಮದು ಪೂರ್ಣಗೊಂಡಿದೆ. ಪ್ರಕಟಿಸುವ ಮೊದಲು ಕರಡುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
          hi: "आयात पूरा हुआ। प्रकाशित करने से पहले ड्राफ़्ट जाँचें।",
        }),
      );
    } catch {
      setMessage(
        tr({
          en: "Connection error. You can resume.",
          kn: "ಸಂಪರ್ಕ ದೋಷ. ಮತ್ತೆ ಮುಂದುವರಿಸಬಹುದು.",
          hi: "कनेक्शन त्रुटि। आप फिर से जारी रख सकते हैं।",
        }),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-grid">
      <label className="field wide">
        {tr({
          en: "CSV file (UTF-8, max 1 MB / 200 rows)",
          kn: "CSV ಕಡತ (UTF-8, ಗರಿಷ್ಠ 1 MB / 200 ಸಾಲುಗಳು)",
          hi: "CSV फ़ाइल (UTF-8, अधिकतम 1 MB / 200 पंक्तियाँ)",
        })}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 1000000)
                throw Error(
                  tr({
                    en: "File is too large.",
                    kn: "ಕಡತ ತುಂಬಾ ದೊಡ್ಡದು.",
                    hi: "फ़ाइल बहुत बड़ी है।",
                  }),
                );
              const parsed = parseCsv(await file.text());
              setRows(parsed);
              setName(file.name);
              setMapping(
                Object.fromEntries(
                  importFields.map((f) => [
                    f,
                    Object.keys(parsed[0] || {}).includes(f) ? f : "",
                  ]),
                ),
              );
              setJob("");
              setResults([]);
              setMessage("");
            } catch (error) {
              setRows([]);
              setMessage(error instanceof Error ? error.message : errorText);
            }
          }}
        />
      </label>
      {!!rows.length && (
        <>
          <label className="field">
            {tr({ en: "Category", kn: "ವರ್ಗ", hi: "श्रेणी" })}
            <select
              disabled={busy || !!job}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_kn}
                </option>
              ))}
            </select>
          </label>
          {importFields.map((field) => (
            <label className="field" key={field}>
              {field}
              <select
                disabled={busy || !!job}
                value={mapping[field] || ""}
                onChange={(e) =>
                  setMapping({ ...mapping, [field]: e.target.value })
                }
              >
                <option value="">
                  {tr({
                    en: "Choose a column",
                    kn: "ಕಾಲಮ್ ಆಯ್ಕೆಮಾಡಿ",
                    hi: "कॉलम चुनें",
                  })}
                </option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="table-scroll wide">
            <table>
              <thead>
                <tr>
                  <th>{tr({ en: "Row", kn: "ಸಾಲು", hi: "पंक्ति" })}</th>
                  <th>{tr({ en: "Title", kn: "ಶೀರ್ಷಿಕೆ", hi: "शीर्षक" })}</th>
                  <th>{tr({ en: "Check", kn: "ಪರಿಶೀಲನೆ", hi: "जाँच" })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => {
                  const mapped = mapImportRow(row, mapping),
                    parsed = importRowSchema.safeParse(mapped);
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{mapped.title_kn}</td>
                      <td>
                        {parsed.success
                          ? tr({
                              en: "Draft ready",
                              kn: "ಕರಡು ಸಿದ್ಧ",
                              hi: "ड्राफ़्ट तैयार",
                            })
                          : parsed.error.issues
                              .map((e) => e.path.join("."))
                              .join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="wide">
            {tr({
              en: `${rows.length} rows in total. Preview of the first 10 rows. Duplicate slugs / videos are not added.`,
              kn: `ಒಟ್ಟು ${rows.length} ಸಾಲುಗಳು. ಮೊದಲ 10 ಸಾಲುಗಳ ಮುನ್ನೋಟ. ನಕಲು slug / ವೀಡಿಯೊಗಳು ಸೇರಿಸಲಾಗುವುದಿಲ್ಲ.`,
              hi: `कुल ${rows.length} पंक्तियाँ। पहली 10 पंक्तियों का पूर्वावलोकन। डुप्लिकेट slug / वीडियो नहीं जोड़े जाते।`,
            })}
          </p>
          <button
            className="button button-ember"
            disabled={busy || !category || results.length === rows.length}
            onClick={() => void run()}
          >
            {job
              ? tr({ en: "Resume", kn: "ಮುಂದುವರಿಸಿ", hi: "जारी रखें" })
              : tr({
                  en: "Import drafts",
                  kn: "ಕರಡುಗಳನ್ನು ಆಮದು ಮಾಡಿ",
                  hi: "ड्राफ़्ट आयात करें",
                })}
          </button>
          <progress
            max={rows.length}
            value={results.length}
            aria-label={tr({
              en: "Import progress",
              kn: "ಆಮದು ಪ್ರಗತಿ",
              hi: "आयात प्रगति",
            })}
          />
        </>
      )}
      <p role="status" className="wide">
        {message}
      </p>
      {!!results.length && (
        <div className="wide">
          <button className="button" onClick={download}>
            {tr({
              en: "Download CSV report",
              kn: "CSV ವರದಿ ಡೌನ್‌ಲೋಡ್",
              hi: "CSV रिपोर्ट डाउनलोड करें",
            })}
          </button>
          <ul>
            {results.map((r) => (
              <li key={r.row}>
                {r.row}: {r.result} {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
