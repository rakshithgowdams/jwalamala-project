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
export function CsvImporter({
  categories,
}: {
  categories: { id: string; name_kn: string }[];
}) {
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
          setMessage(begun.error || "ದೋಷ");
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
      setMessage("ಆಮದು ಪೂರ್ಣಗೊಂಡಿದೆ. ಪ್ರಕಟಿಸುವ ಮೊದಲು ಕರಡುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.");
    } catch {
      setMessage("ಸಂಪರ್ಕ ದೋಷ. ಮತ್ತೆ ಮುಂದುವರಿಸಬಹುದು.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-grid">
      <label className="field wide">
        CSV ಕಡತ (UTF-8, ಗರಿಷ್ಠ 1 MB / 200 ಸಾಲುಗಳು)
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 1000000) throw Error("ಕಡತ ತುಂಬಾ ದೊಡ್ಡದು.");
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
              setMessage(error instanceof Error ? error.message : "ದೋಷ");
            }
          }}
        />
      </label>
      {!!rows.length && (
        <>
          <label className="field">
            ವರ್ಗ
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
                <option value="">ಕಾಲಮ್ ಆಯ್ಕೆಮಾಡಿ</option>
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
                  <th>ಸಾಲು</th>
                  <th>ಶೀರ್ಷಿಕೆ</th>
                  <th>ಪರಿಶೀಲನೆ</th>
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
                          ? "ಕರಡು ಸಿದ್ಧ"
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
            ಒಟ್ಟು {rows.length} ಸಾಲುಗಳು. ಮೊದಲ 10 ಸಾಲುಗಳ ಮುನ್ನೋಟ. ನಕಲು slug /
            ವೀಡಿಯೊಗಳು ಸೇರಿಸಲಾಗುವುದಿಲ್ಲ.
          </p>
          <button
            className="button button-ember"
            disabled={busy || !category || results.length === rows.length}
            onClick={() => void run()}
          >
            {job ? "ಮುಂದುವರಿಸಿ" : "ಕರಡುಗಳನ್ನು ಆಮದು ಮಾಡಿ"}
          </button>
          <progress
            max={rows.length}
            value={results.length}
            aria-label="ಆಮದು ಪ್ರಗತಿ"
          />
        </>
      )}
      <p role="status" className="wide">
        {message}
      </p>
      {!!results.length && (
        <div className="wide">
          <button className="button" onClick={download}>
            CSV ವರದಿ ಡೌನ್‌ಲೋಡ್
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
