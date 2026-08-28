import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  startPix,
  waitForConfirmation,
  startPrototypePix,
  confirmPrototypePix,
  writeText,
} = vi.hoisted(() => ({
  startPix: vi.fn(),
  waitForConfirmation: vi.fn(),
  startPrototypePix: vi.fn(),
  confirmPrototypePix: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("@/lib/donations", () => ({
  startMercadoPagoPixDonation: startPix,
  waitForDonationConfirmation: waitForConfirmation,
  startPrototypePixDonation: startPrototypePix,
  confirmPrototypePixDonation: confirmPrototypePix,
}));

vi.mock("@/components/ui/payment-success-check", () => ({
  PaymentSuccessCheck: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={onComplete}>
      Pagamento identificado
    </button>
  ),
}));

import NGOProfile from "@/components/NGOProfile";
import { demoNgos } from "@/data/demoNgos";
import { TRANQUILICARE_FOUNDER_NGO } from "@/data/tranquilicarePrototype";

describe("NGOProfile PIX checkout", () => {
  let resolveConfirmation: (value: {
    id: string;
    amount: number;
    donor_id: null;
    donor_email: null;
    created_at: string;
    ngo_id: string;
    payment_action_id: string;
  }) => void;

  beforeEach(() => {
    localStorage.clear();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    startPix.mockResolvedValue({
      actionId: "ORD-1",
      confirmationToken: "confirmation-token",
      qrCodeText: "000201-test-pix",
    });
    startPrototypePix.mockReturnValue({
      actionId: "prototype-pix-test",
      confirmationToken: "prototype-confirmation-token",
      qrCodeText: "SIMULACAO-PIX:prototype-pix-test",
      isPrototype: true,
      prototypeDonation: {
        organizationId: TRANQUILICARE_FOUNDER_NGO.id,
        amountCents: 5000,
        createdAt: "2026-08-27T12:00:00.000Z",
      },
    });
    confirmPrototypePix.mockReturnValue({
      id: "prototype-donation-test",
      amount: 5000,
      donor_id: null,
      donor_email: null,
      created_at: "2026-08-27T12:00:00.000Z",
      ngo_id: TRANQUILICARE_FOUNDER_NGO.id,
      payment_action_id: "prototype-pix-test",
    });
    waitForConfirmation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirmation = resolve;
        }),
    );
  });

  afterEach(() => {
    cleanup();
    startPix.mockReset();
    waitForConfirmation.mockReset();
    startPrototypePix.mockReset();
    confirmPrototypePix.mockReset();
    writeText.mockReset();
  });

  it("confirma a doação somente depois que o backend identifica o PIX", async () => {
    render(
      <MemoryRouter>
        <NGOProfile ngo={demoNgos[0]} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Apoiar esta causa" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Editar valor manualmente/i }),
    );

    const amountInput = screen.getByLabelText(/em reais$/i);
    fireEvent.change(amountInput, { target: { value: "50" } });
    fireEvent.blur(amountInput);
    expect(screen.getByText("TranquiliCare · 5%")).not.toBeNull();
    expect(screen.getByText((_, element) => element?.textContent?.includes("que você escolheu chegam à organização. O valor do TranquiliCare é adicionado separadamente.") ?? false, { selector: "p" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("PIX PRONTO")).not.toBeNull();
    expect(screen.getByText("Tudo pronto para concluir sua doação.")).not.toBeNull();
    expect(screen.getByText("Abra o QR Code ou copie o código PIX para pagar pelo app do seu banco.")).not.toBeNull();
    const supportButton = screen.getByRole("button", {
      name: "Ver PIX",
    });
    expect(
      screen.queryByRole("img", {
        name: "QR Code PIX para pagamento",
      }),
    ).toBeNull();

    fireEvent.click(supportButton);

    expect(screen.queryByText("PIX PRONTO")).toBeNull();
    expect(await screen.findByText("Sua doação será confirmada automaticamente assim que o pagamento for identificado.")).not.toBeNull();
    expect(
      await screen.findByRole("img", {
        name: "QR Code PIX para pagamento",
      }),
    ).not.toBeNull();
    const copyButton = screen.getByRole("button", {
      name: "Copiar código PIX",
    });
    fireEvent.click(copyButton);
    expect(writeText).toHaveBeenCalledWith("000201-test-pix");
    expect(
      await screen.findByRole("button", { name: "Código PIX copiado" }),
    ).not.toBeNull();
    expect(startPix).toHaveBeenCalledWith({
      organizationId: demoNgos[0].id,
      amountCents: 5000,
      payerEmail: undefined,
    });
    expect(
      document.querySelector(".apple-edge-glow")?.getAttribute("data-stage"),
    ).toBe("4");

    fireEvent.click(
      screen.getByRole("button", { name: "Pagamento concluído" }),
    );
    expect(await screen.findByText("Só um instante. Estamos confirmando seu PIX.")).not.toBeNull();
    expect(screen.queryByText("Assim que o PIX for identificado, sua doação será confirmada automaticamente.")).toBeNull();
    expect(waitForConfirmation).toHaveBeenCalledWith(
      "ORD-1",
      null,
      "confirmation-token",
    );

    resolveConfirmation({
      id: "donation-1",
      amount: 5000,
      donor_id: null,
      donor_email: null,
      created_at: "2026-08-24T12:00:00.000Z",
      ngo_id: demoNgos[0].id,
      payment_action_id: "ORD-1",
    });

    const successCheck = await screen.findByRole("button", {
      name: "Pagamento identificado",
    });
    expect(
      screen.queryByText("Parabéns por transformar intenção em apoio."),
    ).toBeNull();
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    fireEvent.click(successCheck);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Agora você faz parte desta história. E ela só está começando."),
    ).not.toBeNull();
  });

  it("gera um PIX de demonstração para a TranquiliCare sem acionar uma cobrança real", async () => {
    render(
      <MemoryRouter>
        <NGOProfile ngo={TRANQUILICARE_FOUNDER_NGO} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Apoiar esta causa" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Editar valor manualmente/i }),
    );
    fireEvent.change(screen.getByLabelText(/em reais$/i), {
      target: { value: "50" },
    });
    fireEvent.blur(screen.getByLabelText(/em reais$/i));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("PIX de demonstração")).not.toBeNull();
    expect(screen.getByText(/Nenhuma cobrança será realizada/i)).not.toBeNull();
    expect(startPix).not.toHaveBeenCalled();
    expect(startPrototypePix).toHaveBeenCalledWith({
      organizationId: TRANQUILICARE_FOUNDER_NGO.id,
      amountCents: 5000,
      payerEmail: undefined,
    });
  });
});
