"use client";
import { useState } from "react";
import { parseCsv } from "@/lib/v4/import";
import { toCsv } from "@/lib/v4/csv";
import {
  utilityFields,
  parseUtilityRow,
  type UtilityResource,
} from "@/lib/v4/utility-import";
import { importUtility } from "@/app/admin/utility-import/actions";
export function UtilityImporter() {
  const [kind, setKind] = useState<UtilityResource>("jain_calendar_days"),
    [rows, setRows] = useState<Record<string, string>[]>([]),
    [results, setResults] = useState<
      { row: number; status: string; detail: string }[]
    >([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  function download(name: string, text: string) {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
  const invalid = rows.filter((r) => !parseUtilityRow(kind, r).success).length;
  return (
    <section className="utility-panel">
      <h1>Calendar and utility CSV import</h1>
      <p>
        Review source data before importing. Existing entries with the same date
        and identifier are updated. Maximum 200 rows, 1 MB. Calendar observances
        require your community advisor’s verification.
      </p>
      <label className="field">
        Data
        <select
          disabled={busy}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as UtilityResource);
            setRows([]);
            setResults([]);
          }}
        >
          {Object.keys(utilityFields).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <p>Columns: {utilityFields[kind].join(", ")}</p>
      <button
        type="button"
        className="button"
        onClick={() =>
          download(kind + "-template.csv", utilityFields[kind].join(","))
        }
      >
        Download template
      </button>
      <label className="field">
        CSV
        <input
          disabled={busy}
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setRows([]);
            setResults([]);
            if (!file) return;
            try {
              if (file.size > 1048576) throw Error("Maximum file size is 1 MB");
              setRows(parseCsv(await file.text()));
              setMessage("");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Invalid CSV",
              );
            }
          }}
        />
      </label>
      <p>
        {rows.length} rows · {invalid} invalid
      </p>
      {rows.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {utilityFields[kind].map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  {utilityFields[kind].map((k) => (
                    <td key={k}>{r[k]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="button button-ember"
        disabled={busy || !rows.length || invalid > 0}
        onClick={async () => {
          setBusy(true);
          setResults([]);
          try {
            const report = [];
            for (let offset = 0; offset < rows.length; offset += 20) {
              const result = await importUtility(
                kind,
                rows.slice(offset, offset + 20),
              );
              report.push(
                ...result.map((r) => ({ ...r, row: r.row + offset })),
              );
              setResults([...report]);
            }
            setMessage("Import finished. Review the report below.");
          } catch {
            setMessage(
              "Connection failed. Reimporting safely updates the same records.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Importing…" : "Import reviewed rows"}
      </button>
      <p role="status">{message}</p>
      {results.length > 0 && (
        <>
          <p>
            {results.filter((r) => r.status === "saved").length} saved /{" "}
            {results.length} processed
          </p>
          <button
            className="button"
            onClick={() =>
              download(
                "import-report.csv",
                toCsv(results, ["row", "status", "detail"]),
              )
            }
          >
            Download report
          </button>
          {results
            .filter((r) => r.status !== "saved")
            .map((r) => (
              <p key={r.row}>
                Row {r.row}: {r.detail}
              </p>
            ))}
        </>
      )}
    </section>
  );
}
