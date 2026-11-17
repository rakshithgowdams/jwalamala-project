import { describe, it, expect } from "vitest";
import {
  translatable,
  translationColumns,
  planTranslation,
  applyTranslation,
} from "@/lib/ai/translatable";

// market_rates.unit is rendered raw next to the value on /rates. It shipped with
// no translation slot at all, so these pin the whole path: column, editor, plan
// and merge.
describe("market_rates unit translation", () => {
  const fields = translatable.market_rates;
  const row = {
    unit: "ಲೀಟರ್",
    unit_en: "",
    unit_hi: "",
    source: "ಮೂಲ",
    source_en: "",
    source_hi: "",
  };

  it("selects the unit columns", () => {
    const columns = translationColumns(fields);
    expect(columns).toContain("unit");
    expect(columns).toContain("unit_en");
    expect(columns).toContain("unit_hi");
  });

  it("asks for the unit on the short pass", () => {
    const wanted = planTranslation(fields, row, "short", "en");
    expect(Object.values(wanted)).toContain("ಲೀಟರ್");
  });

  it("writes the answer to unit_en", () => {
    const wanted = planTranslation(fields, row, "short", "en");
    const key = Object.keys(wanted).find((k) => wanted[k] === "ಲೀಟರ್")!;
    const patch = applyTranslation(fields, row, "short", "en", wanted, {
      [key]: "litre",
    });
    expect(patch).toMatchObject({ unit_en: "litre" });
  });

  it("leaves a unit an editor already translated alone", () => {
    const wanted = planTranslation(
      fields,
      { ...row, unit_en: "litre" },
      "short",
      "en",
    );
    expect(Object.values(wanted)).not.toContain("ಲೀಟರ್");
  });
});
