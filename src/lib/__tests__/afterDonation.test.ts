import { describe, expect, it } from "vitest";

import {
  AFTER_DONATION_STAGES,
  buildRecommendedContactPlan,
  canRenderAfterDonationTab,
  groupContactsByDate,
} from "@/lib/afterDonation";

describe("after donation relationship domain", () => {
  it("keeps the relationship journey in the expected order", () => {
    expect(AFTER_DONATION_STAGES.map((stage) => stage.label)).toEqual([
      "Doações novas",
      "1º agradecimento",
      "História enviada",
      "Acompanhamento",
      "Impacto compartilhado",
      "Fim dessa história",
    ]);
  });

  it("shows the private tab only to the NGO that owns the profile", () => {
    expect(
      canRenderAfterDonationTab({
        ownerMode: true,
        accountType: "ngo",
        currentUserId: "ngo-1",
        organizationId: "ngo-1",
      }),
    ).toBe(true);
    expect(
      canRenderAfterDonationTab({
        ownerMode: false,
        accountType: "ngo",
        currentUserId: "ngo-1",
        organizationId: "ngo-1",
      }),
    ).toBe(false);
    expect(
      canRenderAfterDonationTab({
        ownerMode: true,
        accountType: "ngo",
        currentUserId: "ngo-2",
        organizationId: "ngo-1",
      }),
    ).toBe(false);
  });

  it("builds a 30-day contact guide with two or three recommendations per full week", () => {
    const contacts = buildRecommendedContactPlan({
      relationshipId: "relationship-1",
      donorName: "Ana Souza",
      donatedAt: "2026-08-03T12:00:00.000Z",
    });

    expect(contacts).toHaveLength(10);
    expect(contacts[0]).toMatchObject({
      relationshipId: "relationship-1",
      donorName: "Ana Souza",
      kind: "thanks",
      scheduledFor: "2026-08-03",
    });
    expect(contacts.at(-1)).toMatchObject({
      kind: "closing",
      scheduledFor: "2026-09-02",
    });

    const countsByWeek = contacts.reduce<Record<number, number>>((counts, contact) => {
      const elapsed = Math.floor(
        (Date.parse(`${contact.scheduledFor}T12:00:00.000Z`) -
          Date.parse("2026-08-03T12:00:00.000Z")) /
          86_400_000,
      );
      const week = Math.floor(elapsed / 7);
      counts[week] = (counts[week] ?? 0) + 1;
      return counts;
    }, {});

    expect(countsByWeek[0]).toBeGreaterThanOrEqual(2);
    expect(countsByWeek[0]).toBeLessThanOrEqual(3);
    expect(countsByWeek[1]).toBeGreaterThanOrEqual(2);
    expect(countsByWeek[1]).toBeLessThanOrEqual(3);
    expect(countsByWeek[2]).toBeGreaterThanOrEqual(2);
    expect(countsByWeek[2]).toBeLessThanOrEqual(3);
    expect(countsByWeek[3]).toBeGreaterThanOrEqual(2);
    expect(countsByWeek[3]).toBeLessThanOrEqual(3);
  });

  it("keeps more than one donor on the same calendar day", () => {
    const grouped = groupContactsByDate([
      {
        id: "contact-1",
        relationshipId: "relationship-1",
        donorName: "Ana Souza",
        scheduledFor: "2026-08-03",
        kind: "thanks",
        title: "Primeiro agradecimento",
        status: "recommended",
      },
      {
        id: "contact-2",
        relationshipId: "relationship-2",
        donorName: "Carlos Lima",
        scheduledFor: "2026-08-03",
        kind: "thanks",
        title: "Primeiro agradecimento",
        status: "recommended",
      },
    ]);

    expect(grouped.get("2026-08-03")?.map((contact) => contact.donorName)).toEqual([
      "Ana Souza",
      "Carlos Lima",
    ]);
  });
});
