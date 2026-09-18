import { describe, it, expect } from "vitest";
import {
  parseCsv,
  mapImportRow,
  importRowSchema,
  textToHtml,
} from "@/lib/v4/import";
import { homeSchema, defaultHome } from "@/lib/v4/home";
import { splitSpeech } from "@/lib/audio/chunks";
import {
  safePushEndpoint,
  pushPreferencesSchema,
  defaultPush,
} from "@/lib/push/schema";
describe("CSV draft import", () => {
  it("handles BOM, quoted commas, doubled quotes and multiline fields", () => {
    expect(
      parseCsv('\uFEFFtitle,body\r\n"Hello, world","First\n""quoted"""'),
    ).toEqual([{ title: "Hello, world", body: 'First\n"quoted"' }]);
  });
  it("rejects malformed quoting, duplicate headers and ragged rows", () => {
    for (const csv of ["a,a\n1,2", "a,b\n1", 'a\n"unterminated', 'a\n"ok"bad'])
      expect(() => parseCsv(csv)).toThrow();
  });
  it("requires real dates and slugs, escapes imported body text", () => {
    expect(
      importRowSchema.safeParse(
        mapImportRow({ Title: "Story" }, { title_kn: "Title" }),
      ).success,
    ).toBe(false);
    expect(textToHtml("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});
describe("homepage configuration", () => {
  it("rejects duplicate sections and accepts the default", () => {
    expect(homeSchema.parse(defaultHome)).toEqual(defaultHome);
    expect(
      homeSchema.safeParse({
        ...defaultHome,
        sections: [defaultHome.sections[0], defaultHome.sections[0]],
      }).success,
    ).toBe(false);
  });
});
describe("speech chunks", () => {
  it("keeps sentences whole when they fit", () => {
    const sentence = "A".repeat(60) + ".";
    expect(splitSpeech(sentence + " " + sentence, 100)).toEqual([
      sentence,
      sentence,
    ]);
  });
  it("bounds Unicode chunks without splitting surrogate pairs", () => {
    const chunks = splitSpeech("😀".repeat(240), 100);
    expect(chunks.map((s) => Array.from(s).length)).toEqual([100, 100, 40]);
    expect(chunks.join("")).toBe("😀".repeat(240));
  });
});
describe("push controls", () => {
  it("rejects arbitrary and credentialed delivery hosts", () => {
    expect(safePushEndpoint("https://fcm.googleapis.com/test")).toBe(true);
    for (const url of [
      "http://fcm.googleapis.com/test",
      "https://127.0.0.1/test",
      "https://fcm.googleapis.com.attacker.com/test",
      "https://user@fcm.googleapis.com/test",
      "https://fcm.googleapis.com:8443/test",
    ])
      expect(safePushEndpoint(url)).toBe(false);
  });
  it("bounds daily caps and quiet hours", () => {
    expect(pushPreferencesSchema.parse(defaultPush)).toEqual(defaultPush);
    expect(
      pushPreferencesSchema.safeParse({ ...defaultPush, daily_cap: 0 }).success,
    ).toBe(false);
  });
});
