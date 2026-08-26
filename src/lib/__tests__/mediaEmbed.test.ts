import { describe, expect, it } from "vitest";

import { isValidVideoUrl, resolveVideoEmbed } from "@/lib/mediaEmbed";

describe("mediaEmbed", () => {
  it.each([
    ["https://youtu.be/G9V69J7cQtY", "youtube"],
    ["https://www.instagram.com/reel/C8example/", "instagram"],
    ["https://www.tiktok.com/@tranquilicare/video/7412345678901234567", "tiktok"],
    ["https://cdn.example.com/story.mp4", "direct"],
    ["/assets/videos/story.mp4", "direct"],
  ])("resolve %s as %s", (url, provider) => {
    expect(resolveVideoEmbed(url)?.provider).toBe(provider);
    expect(isValidVideoUrl(url)).toBe(true);
  });

  it("rejects profile and malformed social links", () => {
    expect(isValidVideoUrl("https://www.instagram.com/tranquilicare/")).toBe(false);
    expect(isValidVideoUrl("not-a-video")).toBe(false);
  });
});
