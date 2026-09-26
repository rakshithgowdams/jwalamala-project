import { describe, it, expect } from "vitest";
import { pushTopics } from "@/lib/push/schema";
import { uiStrings, locales } from "@/lib/i18n/strings";

describe("push topic labels", () => {
  it("covers every topic in every locale", () => {
    for (const locale of locales) {
      const labels = uiStrings(locale).pushLabels;
      for (const topic of pushTopics) {
        expect(labels[topic], `${locale}/${topic}`).toBeTruthy();
      }
    }
  });

  it("carries a distinct value per locale rather than falling back", () => {
    const [kn, en, hi] = locales.map((l) => uiStrings(l).pushLabels);
    for (const topic of pushTopics) {
      expect(new Set([kn[topic], en[topic], hi[topic]]).size, topic).toBe(3);
    }
  });
});
