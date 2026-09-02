import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DonorProfile from '@/pages/DonorProfile';

const donorUser = {
  id: 'donor-new',
  email: 'ana@example.com',
  name: 'Ana Souza',
  avatar: null,
  credits: 0,
  accountType: 'donor' as const,
  donorProfile: null,
};

const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authReady: Promise.resolve(),
  getUser: () => donorUser,
  onAuthChange: () => () => undefined,
  signOut: vi.fn(),
  updateUser: authMocks.updateUser,
}));

vi.mock('@/lib/impact', () => ({
  computeStreak: () => 0,
  formatBRL: (value: number) => `R$ ${value}`,
  useCountUp: (value: number) => value,
  useDonationImpact: () => ({ rows: [] }),
  weekStrip: () => [],
}));

vi.mock('@/components/AppBottomNav', () => ({ default: () => null }));
vi.mock('@/components/WalletCard', () => ({ default: () => null }));
vi.mock('@/components/ui/impact-stat-carousel', () => ({ default: () => null }));

describe('DonorProfile personalization', () => {
  afterEach(cleanup);

  beforeEach(() => {
    authMocks.updateUser.mockReset();
    authMocks.updateUser.mockImplementation(async (patch) => ({ ...donorUser, ...patch }));
  });

  it('opens after signup and persists the donor presentation and interests', async () => {
    const user = userEvent.setup();
    const LocationProbe = () => {
      const location = useLocation();
      return <output data-testid='location'>{location.pathname}{location.search}</output>;
    };

    render(
      <MemoryRouter initialEntries={['/donor/profile?setup=1']}>
        <DonorProfile />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sua conta está pronta, Ana/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Sobre você/i), { target: { value: 'Gosto de acompanhar iniciativas próximas da minha comunidade.' } });
    fireEvent.change(screen.getByLabelText(/Localização/i), { target: { value: 'São Paulo, SP' } });
    fireEvent.change(screen.getByLabelText(/Instagram/i), { target: { value: '@anasouza' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByLabelText(/Imagem de capa/i), { target: { value: 'https://example.com/ana-cover.jpg' } });
    await user.click(screen.getByRole('button', { name: 'Educação' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({
        name: 'Ana Souza',
        avatar: null,
        donorProfile: {
          bio: 'Gosto de acompanhar iniciativas próximas da minha comunidade.',
          location: 'São Paulo, SP',
          instagram: '@anasouza',
          phone: '11987654321',
          coverImage: 'https://example.com/ana-cover.jpg',
          interests: ['Educação'],
        },
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/donor/profile');
    });
  });

  it('only offers avatar replacement while editing and removes completion achievements', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/donor/profile']}><DonorProfile /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Ana Souza' });
    expect(screen.queryByRole('button', { name: 'Trocar foto' })).toBeNull();
    expect(screen.queryByTitle(/completo/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Conquistas' })).toBeNull();

    await user.click(screen.getByRole('button', { name: /Editar perfil/i }));
    expect(screen.getByRole('button', { name: 'Trocar foto' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Salvo' }).hasAttribute('disabled')).toBe(true);
  });
});
