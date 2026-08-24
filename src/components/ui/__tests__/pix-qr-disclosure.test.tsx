import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PixQrDisclosure } from "@/components/ui/pix-qr-disclosure";

describe("PixQrDisclosure", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("mantém o código PIX oculto e ainda permite copiá-lo", async () => {
    const onExpandedChange = vi.fn();
    render(
      <PixQrDisclosure
        value="000201-payload-secreto"
        onExpandedChange={onExpandedChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Só Abrir QR" }),
    );

    expect(screen.queryByText("000201-payload-secreto")).toBeNull();
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(
      screen
        .getByRole("button", { name: "Copiar código PIX" })
        .textContent?.replace(/\u00a0/g, " "),
    ).toContain("Copiar código PIX");
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar código PIX" }),
    );

    expect(writeText).toHaveBeenCalledWith("000201-payload-secreto");
    expect(
      await screen.findByRole("button", { name: "Código PIX copiado" }),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Fechar QR Code" }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });
});