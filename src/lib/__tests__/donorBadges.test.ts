import { describe, expect, it } from "vitest";

import { mergeCurrentDonationBadge } from "@/lib/donorBadges";

describe("donor badges", () => {
  it("adds the category earned by the current confirmed donation", () => {
    const badges = mergeCurrentDonationBadge([], "Saúde Mental");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toMatchObject({ code: "saude-mental", selected: true });
  });

  it("does not duplicate an already earned category", () => {
    const first = mergeCurrentDonationBadge([], "Pets");
    expect(mergeCurrentDonationBadge(first, "Pets")).toHaveLength(1);
  });
});
