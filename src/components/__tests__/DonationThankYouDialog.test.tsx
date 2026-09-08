import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DonationThankYouDialog from "@/components/DonationThankYouDialog";

const defaultProps = {
  open: true,
  amountCents: 5_000,
  organizationId: "00000000-0000-4000-8000-000000000001",
  ngoName: "Abraço Sereno",
  ngoCategory: "Saúde Mental",
  ngoImage: "/ngo-logo.png",
  ngoPhotos: ["/historia-1.jpg", "/historia-2.jpg", "/historia-3.jpg"],
  donorId: "donor-1",
  donorName: "Leonardo Scalisse",
  donorUsername: "@leonardo",
  donorAvatar: "/leonardo.jpg",
  friendCode: "TC-LEO10",
  hasDonorAccount: false,
  onCreateAccount: vi.fn(),
  onTransferComplete: vi.fn(),
};

const renderDialog = () => render(<DonationThankYouDialog {...defaultProps} />);

describe("DonationThankYouDialog", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("resume a confirmação sem player e com o convite de acompanhamento", () => {
    renderDialog();

    expect(screen.getByText("DOAÇÃO CONFIRMADA")).not.toBeNull();
    expect(
      screen.getByText(
        "Agora você faz parte desta história. E ela só está começando.",
      ),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Quero acompanhar" }),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Assistir à história de Abraço Sereno",
      }),
    ).toBeNull();
    expect(
      screen.queryByText("Transforme sua doação em um capítulo pronto para postar."),
    ).toBeNull();
    expect(
      screen.getByText("Leve esta causa para mais gente").closest("section")
        ?.className,
    ).toContain("bg-brand-yellow");
  });

  it("cria cards com fotos horizontais por formato e um só caminho de compartilhamento", async () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: "Compartilhe sua história" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Crie seu card" }),
    ).not.toBeNull();
    const portraitPhotos = screen.getAllByAltText(/História de Abraço Sereno/);
    expect(portraitPhotos).toHaveLength(3);
    portraitPhotos.forEach((photo) =>
      expect(photo.className).toContain("aspect-[4/5]"),
    );
    expect(screen.queryByText("Saúde Mental")).toBeNull();
    expect(screen.getByAltText("Selo Saúde Mental")).not.toBeNull();
    expect(
      screen.getByText(/Conheça e venha também fazer parte dessa história/),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "4:5" }));
    expect(screen.getAllByAltText(/História de Abraço Sereno/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "1:1" }));
    expect(screen.queryByAltText(/História de Abraço Sereno/)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Compartilhar meu apoio" }),
    );
    expect(
      screen.queryByAltText("Foto de perfil de Leonardo Scalisse"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Adicionar selos ao card" }),
    ).not.toBeNull();
    expect(await screen.findByText("Meus Selos")).not.toBeNull();
    expect(
      screen.getByText(
        "Escolha até 3 memórias que você gostaria de mostrar pro mundo.",
      ),
    ).not.toBeNull();
    expect(screen.queryByAltText(/História de Abraço Sereno/)).toBeNull();
    expect(screen.getAllByAltText("Logo de Abraço Sereno")).toHaveLength(1);
    expect(screen.queryByTestId("support-heart")).toBeNull();
    expect(screen.getByText(/TC-LEO10/).className).toContain(
      "text-brand-yellow",
    );
  });

  it("não apresenta impacto fictício quando não há taxa verificada", () => {
    renderDialog();
    expect(screen.getByLabelText("R$ 50,00")).not.toBeNull();
    expect(screen.queryByLabelText("2 kits de alimento")).toBeNull();
    expect(screen.queryByText("1 atendimento veterinário")).toBeNull();
  });

  it("não mostra o convite para quem já fez a doação com conta", () => {
    render(
      <DonationThankYouDialog {...defaultProps} hasDonorAccount />,
    );

    expect(
      screen.queryByRole("button", { name: "Quero acompanhar" }),
    ).toBeNull();
    expect(screen.queryByText("Guarde esta história com você")).toBeNull();
  });
});
