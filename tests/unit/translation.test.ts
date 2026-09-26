import { describe, it, expect } from "vitest";
import { isUsableTranslation } from "@/lib/i18n/script";

const kannada = "ಶ್ರವಣಬೆಳಗೊಳದಲ್ಲಿ ಸಮುದಾಯ ಕಾರ್ಯಕ್ರಮ ನಡೆಯಿತು";

describe("translation script guard", () => {
  it("accepts a real translation in the target script", () => {
    expect(
      isUsableTranslation("en", "Community event held at Shravanabelagola"),
    ).toBe(true);
    expect(
      isUsableTranslation("hi", "श्रवणबेलगोला में समुदाय कार्यक्रम आयोजित हुआ"),
    ).toBe(true);
  });
  it("rejects Kannada echoed back instead of translated", () => {
    expect(isUsableTranslation("en", kannada)).toBe(false);
    expect(isUsableTranslation("hi", kannada)).toBe(false);
  });
  it("rejects the wrong Indic script for the target", () => {
    expect(isUsableTranslation("en", "समुदाय कार्यक्रम आयोजित हुआ")).toBe(
      false,
    );
    expect(
      isUsableTranslation("hi", "Community event at Shravanabelagola"),
    ).toBe(false);
  });
  it("stays strict on a headline, where one foreign word is a large share", () => {
    expect(
      isUsableTranslation("en", "Community event at ಶ್ರವಣಬೆಳಗೊಳ concludes"),
    ).toBe(false);
  });
  it("allows a short quotation in the original script", () => {
    const quoting =
      "The organisers described it as a community gathering, using the phrase ಸಮುದಾಯ in their notice, and said the programme ran from morning until late evening without any interruption to the surrounding streets or the nearby heritage site itself.";
    expect(isUsableTranslation("en", quoting)).toBe(true);
  });
  it("rejects empty output so the field falls back to Kannada", () => {
    expect(isUsableTranslation("en", "")).toBe(false);
    expect(isUsableTranslation("hi", "")).toBe(false);
  });
});
