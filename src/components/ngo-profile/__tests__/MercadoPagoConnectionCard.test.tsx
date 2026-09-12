import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MercadoPagoConnectionCard,
  type MercadoPagoConnectionApi,
} from "../MercadoPagoConnectionCard";

describe("MercadoPagoConnectionCard", () => {
  afterEach(cleanup);

  it("loads status and starts the secure OAuth connection", async () => {
    const api: MercadoPagoConnectionApi = {
      status: vi.fn().mockResolvedValue({ connected: false, liveMode: true }),
      connect: vi.fn().mockResolvedValue({
        authorizationUrl: "https://auth.mercadopago.com.br/authorization?state=opaque",
      }),
      disconnect: vi.fn(),
    };
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(
      <MercadoPagoConnectionCard
        organizationId="11111111-1111-4111-8111-111111111111"
        api={api}
        onNavigate={navigate}
      />,
    );

    expect(await screen.findByText("Mercado Pago ainda não conectado")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Conectar Mercado Pago" }));

    expect(api.connect).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(navigate).toHaveBeenCalledWith(
      "https://auth.mercadopago.com.br/authorization?state=opaque",
    );
  });

  it("blocks an authorization URL outside the Brazilian Mercado Pago host", async () => {
    const api: MercadoPagoConnectionApi = {
      status: vi.fn().mockResolvedValue({ connected: false, liveMode: true }),
      connect: vi.fn().mockResolvedValue({
        authorizationUrl: "https://example.com/authorization?state=opaque",
      }),
      disconnect: vi.fn(),
    };
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(
      <MercadoPagoConnectionCard
        organizationId="11111111-1111-4111-8111-111111111111"
        api={api}
        onNavigate={navigate}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Conectar Mercado Pago" }));

    expect(navigate).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Não foi possível iniciar a conexão",
    );
  });

  it("shows a connected live account and can disconnect it", async () => {
    const api: MercadoPagoConnectionApi = {
      status: vi.fn().mockResolvedValue({
        connected: true,
        readyToReceive: true,
        status: "active",
        liveMode: true,
        expiresAt: "2027-02-24T20:00:00.000Z",
      }),
      connect: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    const user = userEvent.setup();
    render(
      <MercadoPagoConnectionCard
        organizationId="11111111-1111-4111-8111-111111111111"
        api={api}
      />,
    );

    expect(await screen.findByText("Mercado Pago conectado")).toBeTruthy();
    expect(screen.getByText("Recebimentos ativos")).toBeTruthy();
    expect(screen.getByText("Produção")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    await waitFor(() => expect(api.disconnect).toHaveBeenCalledOnce());
    expect(await screen.findByText("Mercado Pago ainda não conectado")).toBeTruthy();
  });

  it("explains an invalid credential encryption key without hiding the retry action", async () => {
    const api: MercadoPagoConnectionApi = {
      status: vi.fn().mockResolvedValue({ connected: false, liveMode: true }),
      connect: vi.fn().mockRejectedValue(new Error("payment-credential-key-invalid")),
      disconnect: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <MercadoPagoConnectionCard
        organizationId="11111111-1111-4111-8111-111111111111"
        api={api}
        embedded
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Conectar Mercado Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "A chave de segurança dos recebimentos é inválida",
    );
    expect((screen.getByRole("button", { name: "Conectar Mercado Pago" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
