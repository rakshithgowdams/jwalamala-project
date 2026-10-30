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
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function UtilityImporter() {
  const { tr } = useUiStrings();
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
  const invalid = rows.filter((r) => !parseUtilityRow(kind, r).success).length,
    saved = results.filter((r) => r.status === "saved").length;
  return (
    <section className="utility-panel">
      <h1>
        {tr({
          en: "Calendar and utility CSV import",
          kn: "ಕ್ಯಾಲೆಂಡರ್ ಮತ್ತು ಉಪಯುಕ್ತ ಮಾಹಿತಿ CSV ಆಮದು",
          hi: "कैलेंडर और उपयोगी जानकारी CSV आयात",
        })}
      </h1>
      <p>
        {tr({
          en: "Review source data before importing. Existing entries with the same date and identifier are updated. Maximum 200 rows, 1 MB. Calendar observances require your community advisor’s verification.",
          kn: "ಆಮದು ಮಾಡುವ ಮೊದಲು ಮೂಲ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಅದೇ ದಿನಾಂಕ ಮತ್ತು ಗುರುತಿನ ಈಗಿನ ನಮೂದುಗಳನ್ನು ನವೀಕರಿಸಲಾಗುತ್ತದೆ. ಗರಿಷ್ಠ 200 ಸಾಲುಗಳು, 1 MB. ಕ್ಯಾಲೆಂಡರ್ ಆಚರಣೆಗಳಿಗೆ ನಿಮ್ಮ ಸಮುದಾಯ ಸಲಹೆಗಾರರ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.",
          hi: "आयात करने से पहले स्रोत डेटा की समीक्षा करें। समान तिथि और पहचानकर्ता वाली मौजूदा प्रविष्टियाँ अपडेट की जाती हैं। अधिकतम 200 पंक्तियाँ, 1 MB। कैलेंडर के पर्वों के लिए आपके समुदाय सलाहकार का सत्यापन आवश्यक है।",
        })}
      </p>
      <label className="field">
        {tr({ en: "Data", kn: "ಮಾಹಿತಿ", hi: "डेटा" })}
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
      <p>
        {tr({ en: "Columns: ", kn: "ಕಾಲಂಗಳು: ", hi: "कॉलम: " })}
        {utilityFields[kind].join(", ")}
      </p>
      <button
        type="button"
        className="button"
        onClick={() =>
          download(kind + "-template.csv", utilityFields[kind].join(","))
        }
      >
        {tr({
          en: "Download template",
          kn: "ಮಾದರಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
          hi: "टेम्पलेट डाउनलोड करें",
        })}
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
              if (file.size > 1048576)
                throw Error(
                  tr({
                    en: "Maximum file size is 1 MB",
                    kn: "ಕಡತದ ಗರಿಷ್ಠ ಗಾತ್ರ 1 MB",
                    hi: "फ़ाइल का अधिकतम आकार 1 MB है",
                  }),
                );
              setRows(parseCsv(await file.text()));
              setMessage("");
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : tr({
                      en: "Invalid CSV",
                      kn: "ಅಮಾನ್ಯ CSV",
                      hi: "अमान्य CSV",
                    }),
              );
            }
          }}
        />
      </label>
      <p>
        {tr({
          en: `${rows.length} rows · ${invalid} invalid`,
          kn: `${rows.length} ಸಾಲುಗಳು · ${invalid} ಅಮಾನ್ಯ`,
          hi: `${rows.length} पंक्तियाँ · ${invalid} अमान्य`,
        })}
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
            setMessage(
              tr({
                en: "Import finished. Review the report below.",
                kn: "ಆಮದು ಪೂರ್ಣಗೊಂಡಿದೆ. ಕೆಳಗಿನ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
                hi: "आयात पूरा हुआ। नीचे दी गई रिपोर्ट देखें।",
              }),
            );
          } catch {
            setMessage(
              tr({
                en: "Connection failed. Reimporting safely updates the same records.",
                kn: "ಸಂಪರ್ಕ ವಿಫಲವಾಯಿತು. ಮತ್ತೆ ಆಮದು ಮಾಡಿದರೆ ಅದೇ ದಾಖಲೆಗಳು ಸುರಕ್ಷಿತವಾಗಿ ನವೀಕರಣಗೊಳ್ಳುತ್ತವೆ.",
                hi: "कनेक्शन विफल रहा। फिर से आयात करने पर वही रिकॉर्ड सुरक्षित रूप से अपडेट होते हैं।",
              }),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? tr({
              en: "Importing…",
              kn: "ಆಮದು ಆಗುತ್ತಿದೆ…",
              hi: "आयात हो रहा है…",
            })
          : tr({
              en: "Import reviewed rows",
              kn: "ಪರಿಶೀಲಿಸಿದ ಸಾಲುಗಳನ್ನು ಆಮದು ಮಾಡಿ",
              hi: "समीक्षित पंक्तियाँ आयात करें",
            })}
      </button>
      <p role="status">{message}</p>
      {results.length > 0 && (
        <>
          <p>
            {tr({
              en: `${saved} saved / ${results.length} processed`,
              kn: `${saved} ಉಳಿಸಲಾಗಿದೆ / ${results.length} ಪರಿಶೀಲಿಸಲಾಗಿದೆ`,
              hi: `${saved} सहेजी गईं / ${results.length} संसाधित`,
            })}
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
            {tr({
              en: "Download report",
              kn: "ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
              hi: "रिपोर्ट डाउनलोड करें",
            })}
          </button>
          {results
            .filter((r) => r.status !== "saved")
            .map((r) => (
              <p key={r.row}>
                {tr({ en: "Row", kn: "ಸಾಲು", hi: "पंक्ति" })} {r.row}:{" "}
                {r.detail}
              </p>
            ))}
        </>
      )}
    </section>
  );
}
