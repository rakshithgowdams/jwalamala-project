import { describe, expect, it } from "vitest";
import sample from "../fixtures/social-sample.json";
import { mapSocialItem, socialItems } from "@/lib/social/map";
import { SOCIAL_POSTERS_SLUG, SOCIAL_VIDEOS_SLUG } from "@/lib/taxonomy";
import { normalizeVideo } from "@/lib/utils/video";

describe("social import mapping", () => {
  it("reads an Apify array export", () => {
    expect(socialItems(sample)).toHaveLength(6);
  });

  it("maps Facebook photos to posters and videos to social-videos", () => {
    const poster = mapSocialItem(sample[0]);
    const video = mapSocialItem(sample[1]);
    const reel = mapSocialItem(sample[2]);
    expect(poster?.type).toBe("article");
    expect(poster?.categorySlug).toBe(SOCIAL_POSTERS_SLUG);
    expect(poster?.title_kn.startsWith("ಶ್ರವಣಬೆಳಗೊಳ")).toBe(true);
    expect(poster?.summary_kn).toContain("ಭಕ್ತರು");
    expect(video?.type).toBe("video");
    expect(video?.categorySlug).toBe(SOCIAL_VIDEOS_SLUG);
    expect(video?.video_provider).toBe("facebook");
    expect(reel?.type).toBe("short");
  });

  it("maps Instagram images, reels and sidecars", () => {
    const image = mapSocialItem(sample[3]);
    const reel = mapSocialItem(sample[4]);
    const sidecar = mapSocialItem(sample[5]);
    expect(image?.type).toBe("article");
    expect(image?.social_platform).toBe("instagram");
    expect(reel?.type).toBe("short");
    expect(reel?.video_provider).toBe("instagram");
    expect(sidecar?.image_layout).toBe("collage3");
    expect(sidecar?.image_urls).toHaveLength(3);
  });

  it("falls back to the dated Kannada title when the caption is empty", () => {
    const mapped = mapSocialItem({
      postId: "999",
      url: "https://www.facebook.com/jwalamalanews/posts/999",
      text: "",
      time: "2026-10-10T00:00:00.000Z",
      isVideo: false,
    });
    expect(mapped?.title_kn).toBe("ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ – 2026-10-10");
  });
});

describe("instagram video urls", () => {
  it("normalises posts and reels", () => {
    expect(normalizeVideo("https://www.instagram.com/p/AbCdEfGhIj/")?.provider).toBe(
      "instagram",
    );
    expect(normalizeVideo("https://www.instagram.com/reel/ReEl123456/?hl=en")?.kind).toBe(
      "reel",
    );
    expect(normalizeVideo("https://instagram.com.evil.test/reel/ReEl123456/")).toBeNull();
  });
});
