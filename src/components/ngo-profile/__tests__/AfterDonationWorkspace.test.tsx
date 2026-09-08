import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AfterDonationWorkspace from "@/components/ngo-profile/AfterDonationWorkspace";
import type { DonorRelationship } from "@/lib/afterDonation";

afterEach(cleanup);

const relationships: DonorRelationship[] = [
  {
    id: "relationship-1",
    organizationId: "ngo-1",
    donationId: "donation-1",
    donorProfileId: "donor-1",
    donorName: "Ana Souza",
    donorEmail: "ana@example.com",
    donorAvatarUrl: null,
    amountCents: 5000,
    donatedAt: "2026-08-03T12:00:00.000Z",
    stage: "new",
    position: 0,
    lastContactAt: null,
    nextContactAt: "2026-08-03T12:00:00.000Z",
    messages: [],
  },
  {
    id: "relationship-2",
    organizationId: "ngo-1",
    donationId: "donation-2",
    donorProfileId: "donor-2",
    donorName: "Carlos Lima",
    donorEmail: "carlos@example.com",
    donorAvatarUrl: null,
    amountCents: 8500,
    donatedAt: "2026-08-03T15:00:00.000Z",
    stage: "thanks",
    position: 0,
    lastContactAt: null,
    nextContactAt: "2026-08-06T12:00:00.000Z",
    messages: [],
  },
];

describe("AfterDonationWorkspace", () => {
  it("opens the donor conversation and registers an outgoing impact message", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <AfterDonationWorkspace
        organizationId="ngo-1"
        initialRelationships={relationships}
        onSendMessage={onSendMessage}
      />,
    );

    expect(screen.getByRole("heading", { name: "Radar de relacionamento" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Abrir relacionamento com Ana Souza/i }));
    expect(screen.getByRole("dialog", { name: "Conversa com Ana Souza" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Mensagem para Ana Souza"), {
      target: { value: "Seu apoio já ajudou no primeiro atendimento." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar atualização" }));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        relationshipId: "relationship-1",
        body: "Seu apoio já ajudou no primeiro atendimento.",
      }),
    ));
  });

  it("opens a contact calendar that can show multiple donors on one day", () => {
    render(
      <AfterDonationWorkspace
        organizationId="ngo-1"
        initialRelationships={relationships}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir calendário de contatos" }));
    const calendar = screen.getByRole("dialog", { name: "Calendário de contatos" });
    expect(calendar).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /2 contatos$/i }));
    expect(within(calendar).getByText("Ana Souza")).toBeTruthy();
    expect(within(calendar).getByText("Carlos Lima")).toBeTruthy();
  });
});
