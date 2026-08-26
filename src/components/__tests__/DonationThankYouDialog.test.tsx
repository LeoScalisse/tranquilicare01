import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DonationThankYouDialog from "@/components/DonationThankYouDialog";

const defaultProps = {
  open: true,
  amountCents: 5_000,
  ngoName: "Abraço Sereno",
  ngoCategory: "Saúde Mental",
  ngoImage: "/ngo-logo.png",
  ngoPhotos: ["/historia-1.jpg", "/historia-2.jpg", "/historia-3.jpg"],
  ngoVideo: "/historia.mp4",
  ngoVideoPoster: "/historia.jpg",
  donorId: "donor-1",
  donorName: "Leonardo Scalisse",
  donorUsername: "@leonardo",
  donorAvatar: "/leonardo.jpg",
  friendCode: "TC-LEO10",
  isLoggedIn: false,
  onCreateAccount: vi.fn(),
  onTransferComplete: vi.fn(),
};

const renderDialog = () => render(<DonationThankYouDialog {...defaultProps} />);

describe("DonationThankYouDialog", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("resume a confirmação, continua no vídeo e não exibe contador ou X", () => {
    renderDialog();

    expect(screen.getByText("DOAÇÃO CONFIRMADA")).not.toBeNull();
    expect(
      screen.getByText(
        "Agora você faz parte desta história. E ela só está começando.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText("A história continua aqui.")).toBeNull();
    expect(
      screen.queryByText(/Sua doação foi confirmada e seguirá/),
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Assistir à história de Abraço Sereno",
      }),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Fechar agradecimento" }),
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

  it("troca a expressão de impacto com ritmo ágil", () => {
    vi.useFakeTimers();
    renderDialog();
    expect(screen.getByLabelText("R$ 50,00")).not.toBeNull();
    expect(
      screen
        .getByTestId("rotating-3d-stagger-text")
        .querySelector(".tc-3d-stagger-character"),
    ).not.toBeNull();
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByLabelText("2 kits de alimento")).not.toBeNull();
  });
  it("mantém a confirmação aberta enquanto o vídeo expandido está ativo", async () => {
    renderDialog();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Assistir à história de Abraço Sereno",
      }),
    );
    const videoDialog = screen.getByRole("dialog", {
      name: "História de Abraço Sereno",
    });

    fireEvent.pointerDown(videoDialog);
    fireEvent.click(videoDialog);

    expect(screen.getByText("DOAÇÃO CONFIRMADA")).not.toBeNull();
    expect(defaultProps.onTransferComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Fechar vídeo" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "História de Abraço Sereno" }),
      ).toBeNull();
    });
    expect(screen.getByText("DOAÇÃO CONFIRMADA")).not.toBeNull();
  });
});
