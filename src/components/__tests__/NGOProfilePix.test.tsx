import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { startPix, waitForConfirmation, writeText } = vi.hoisted(() => ({
  startPix: vi.fn(),
  waitForConfirmation: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("@/lib/donations", () => ({
  startMercadoPagoPixDonation: startPix,
  waitForDonationConfirmation: waitForConfirmation,
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
    fireEvent.change(screen.getByLabelText("Seu e-mail para o pagamento"), {
      target: { value: "doador@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Seu PIX está pronto.")).not.toBeNull();
    expect(
      screen.getByText(
        "Abra o QR Code ou copie o código para concluir o pagamento pelo seu banco.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText("PIX pronto")).toBeNull();

    const supportButton = screen.getByRole("button", {
      name: "Abrir QR",
    });
    expect(
      screen.queryByRole("img", {
        name: "QR Code PIX para pagamento",
      }),
    ).toBeNull();

    fireEvent.click(supportButton);

    expect(
      await screen.findByText("Pague pelo app do seu banco"),
    ).not.toBeNull();
    expect(
      screen.getByText("Escaneie o QR Code ou copie o código PIX."),
    ).not.toBeNull();
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
      payerEmail: "doador@exemplo.com",
    });
    expect(
      document.querySelector(".apple-edge-glow")?.getAttribute("data-stage"),
    ).toBe("4");

    fireEvent.click(
      screen.getByRole("button", { name: "Pagamento concluído" }),
    );
    expect(
      await screen.findByText("Confirmando seu pagamento..."),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Assim que o PIX for identificado, sua doação será confirmada automaticamente.",
      ),
    ).not.toBeNull();
    expect(waitForConfirmation).toHaveBeenCalledWith(
      "ORD-1",
      "doador@exemplo.com",
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
});