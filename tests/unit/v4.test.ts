import { describe, it, expect } from "vitest";
import {
  activeTrending,
  topicPosts,
  paginate,
  safePublicLink,
  xml,
} from "@/lib/v4/utils";
import { v4Demo } from "@/lib/v4/demo";
import { demoPosts } from "@/lib/data/demo";
import { pollutantIndex, naqi, hourlyAverage } from "@/lib/weather/aqi";
import { dailyTimes, istTime, jainRulesSchema } from "@/lib/jain/times";
import { communitySubmissionSchema } from "@/lib/v4/submissions";
import { scoreQuiz, voteSchema } from "@/lib/v4/engagement";
import {
  roleControlSchema,
  providerControlSchema,
} from "@/lib/v4/control-schema";
import { publicationIssues } from "@/lib/v4/workflow";
describe("discovery boundaries", () => {
  it("filters scheduled and unsafe trending links", () => {
    const base = v4Demo.trending_items[0],
      now = new Date("2026-09-16T00:00:00Z");
    expect(
      activeTrending(
        [
          { ...base, id: "a", url: "javascript:alert(1)" },
          { ...base, id: "b", starts_at: "2027-01-01T00:00:00Z" },
          {
            ...base,
            id: "c",
            starts_at: null,
            ends_at: "2026-09-16T00:00:00Z",
          },
          { ...base, id: "d", starts_at: null, ends_at: null },
        ],
        now,
      ).map((r) => r.id),
    ).toEqual(["d"]);
  });
  it("pins topic stories once, before tagged matches", () => {
    const topic = v4Demo.topics[0],
      post = demoPosts[0];
    const rows = topicPosts(
      { ...topic, tag_ids: ["tag"] },
      [{ topic_id: topic.id, post_id: post.id, sort_order: 0 }],
      [
        { post_id: post.id, tag_id: "tag" },
        { post_id: demoPosts[1].id, tag_id: "tag" },
      ],
      demoPosts,
    );
    expect(rows.map((p) => p.id)).toEqual([post.id, demoPosts[1].id]);
  });
  it("clamps malformed pages", () => {
    expect(paginate([1, 2, 3], "Infinity", 2).page).toBe(1);
    expect(paginate([1, 2, 3], "999", 2).rows).toEqual([3]);
    expect(paginate([], "-8").pages).toBe(1);
  });
  it("rejects credential and script links and escapes XML", () => {
    for (const url of [
      "javascript:alert(1)",
      "//evil.test",
      "https://name:secret@example.com",
      "/\\evil.test",
    ])
      expect(safePublicLink(url)).toBeNull();
    expect(safePublicLink("/news/test")).toBe("/news/test");
    expect(xml('<x a="b">&')).toBe("&lt;x a=&quot;b&quot;&gt;&amp;");
  });
});
describe("weather and astronomical times", () => {
  it("implements pollutant breakpoints and minimum coverage", () => {
    expect(pollutantIndex("pm25", 30)).toBe(50);
    expect(pollutantIndex("pm25", 31)).toBe(51);
    expect(pollutantIndex("pm25", 250)).toBe(400);
    expect(pollutantIndex("pm25", 251)).toBe(401);
    expect(pollutantIndex("pm10", NaN)).toBeNull();
    expect(naqi({ pm25: 30, pm10: null, no2: 40, so2: 40 })).toBe(50);
    expect(naqi({ pm25: null, pm10: null, no2: 40, so2: 40 })).toBeNull();
  });
  it("does not invent an average from insufficient hours", () => {
    expect(hourlyAverage(Array(15).fill(10))).toBeNull();
    expect(hourlyAverage([...Array(16).fill(10), null])).toBe(10);
  });
  it("returns IST sunrise before sunset and no unapproved observances", () => {
    const result = dailyTimes("2026-09-16", 13.00715, 76.0962);
    expect(result.observances).toEqual([]);
    expect(result.sunrise! < result.sunset!).toBe(true);
    expect(istTime(result.sunrise)).toMatch(/^06:/);
    expect(istTime(result.sunset)).toMatch(/^18:/);
    expect(() => dailyTimes("2026-02-31", 13, 76)).toThrow();
  });
  it("requires named approval for religious offsets", () => {
    expect(
      jainRulesSchema.safeParse({ approved: true, approved_by: "", rules: [] })
        .success,
    ).toBe(false);
    const baseline = dailyTimes("2026-09-16", 13, 76);
    const result = dailyTimes("2026-09-16", 13, 76, {
      approved: true,
      approved_by: "test advisor",
      rules: [{ name_kn: "test", base: "sunrise", offset: 48, visible: true }],
    });
    expect(
      Date.parse(result.observances[0].time) - Date.parse(baseline.sunrise!),
    ).toBe(48 * 60000);
  });
});
describe("participation and newsroom validation", () => {
  const input = {
    kind: "opportunity",
    title_kn: "Scholarship",
    body_kn: "Details",
    name: "Person",
    email: "test@example.com",
    date: "2026-12-01",
    type: "scholarship",
    token: "captcha",
    website: "",
  };
  it("requires organisation and matching submission type", () => {
    expect(communitySubmissionSchema.safeParse(input).success).toBe(false);
    expect(
      communitySubmissionSchema.safeParse({ ...input, org: "Trust" }).success,
    ).toBe(true);
    expect(
      communitySubmissionSchema.safeParse({
        ...input,
        org: "Trust",
        type: "shraddhanjali",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid votes and scores quiz answers", () => {
    expect(
      voteSchema.safeParse({ poll_id: "not-uuid", option_index: 0 }).success,
    ).toBe(false);
    expect(
      voteSchema.safeParse({
        poll_id: "00000000-0000-4000-8000-000000000001",
        option_index: -1,
      }).success,
    ).toBe(false);
    expect(
      scoreQuiz(
        [{ question: "q", options: ["a", "b"], answer: 1, explanation: "b" }],
        [1],
      ),
    ).toBe(1);
  });
  it("limits role and provider settings", () => {
    expect(
      roleControlSchema.safeParse({
        role: "reader",
        permission: "service_role",
        allowed: true,
      }).success,
    ).toBe(false);
    expect(
      providerControlSchema.safeParse({
        id: "ai",
        enabled: true,
        monthly_limit: -1,
      }).success,
    ).toBe(false);
  });
  it("checks publication metadata and embargo", () => {
    expect(
      publicationIssues(
        {
          title_kn: "title",
          summary_kn: "",
          event_date: "",
          image_credit: "",
          embargo_until: "2027-01-01T00:00:00Z",
        },
        Date.parse("2026-09-16"),
      ),
    ).toEqual(["summary", "event_date", "credit", "embargo"]);
  });
});
