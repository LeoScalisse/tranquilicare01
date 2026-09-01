import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NGOAccountProfile from '@/pages/NGOAccountProfile';

const ngoUser = {
  id: 'ngo-new', email: 'contato@horizonte.org', name: 'Instituto Horizonte',
  avatar: null, credits: 0, accountType: 'ngo' as const, ngoProfile: null,
};
const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  geocodeAddress: vi.fn(),
  prepareOrganizationVisualMedia: vi.fn(),
  markOrganizationVisualSetupReady: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authReady: Promise.resolve(), getUser: () => ngoUser, onAuthChange: () => () => undefined,
  signOut: vi.fn(), updateUser: authMocks.updateUser,
}));
vi.mock('@/components/AppBottomNav', () => ({ default: () => null }));
vi.mock('@/lib/geocoding', () => ({ geocodeAddress: authMocks.geocodeAddress }));
vi.mock('@/lib/organizationVisualMedia', () => ({
  analyzeMarketplacePhotoFiles: vi.fn().mockResolvedValue(0),
  prepareOrganizationVisualMedia: authMocks.prepareOrganizationVisualMedia,
  markOrganizationVisualSetupReady: authMocks.markOrganizationVisualSetupReady,
  visualMediaErrorMessage: () => 'Não foi possível salvar todas as imagens. Tente novamente.',
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}{location.search}</output>;
};

const selectCategory = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Qual é a principal causa de vocês?' }));
  await user.click(screen.getByRole('option', { name: 'Educação' }));
};

const fillCause = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectCategory(user);
  fireEvent.change(screen.getByLabelText('Por que essa causa existe?'), { target: { value: 'Acreditamos que toda criança merece aprender com segurança.' } });
  fireEvent.change(screen.getByLabelText('O que vocês fazem?'), { target: { value: 'Oferecemos reforço escolar e acompanhamento para famílias.' } });
  fireEvent.change(screen.getByLabelText('O que vocês querem tornar possível agora?'), { target: { value: 'Abrir uma nova turma comunitária.' } });
  fireEvent.change(screen.getByLabelText('Onde vocês atuam?'), { target: { value: 'São Paulo' } });
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'SP' } });
};

describe('NGOAccountProfile', () => {
  afterEach(cleanup);
  beforeEach(() => {
    authMocks.updateUser.mockReset();
    authMocks.geocodeAddress.mockReset();
    authMocks.prepareOrganizationVisualMedia.mockReset();
    authMocks.markOrganizationVisualSetupReady.mockReset();
    authMocks.updateUser.mockImplementation(async (patch) => ({ ...ngoUser, ...patch }));
    authMocks.prepareOrganizationVisualMedia.mockResolvedValue({
      profileLogoUrl: '/logo-original-com-fundo.jpg',
      marketplaceLogoUrl: '/logo-processada-sem-fundo.png',
      coverUrl: null,
      selectedPhotoIndex: 0,
      logoProcessingFallback: false,
    });
    authMocks.markOrganizationVisualSetupReady.mockResolvedValue(undefined);
  });

  it('apresenta a causa antes de pedir dados de verificação ou recebimentos', async () => {
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Apresente sua causa.' })).toBeTruthy();
    expect(screen.getByText('3 de 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Qual é a principal causa de vocês?' })).toBeTruthy();
    expect(screen.getByLabelText('Por que essa causa existe?')).toBeTruthy();
    expect(screen.getByLabelText('O que vocês fazem?')).toBeTruthy();
    expect(screen.getByLabelText('O que vocês querem tornar possível agora?')).toBeTruthy();
    expect(screen.getByLabelText('Onde vocês atuam?')).toBeTruthy();
    expect(screen.queryByLabelText(/^CNPJ/i)).toBeNull();
    expect(screen.queryByLabelText(/^Instagram/i)).toBeNull();
  });

  it('does not save the cause while its public fields are incomplete', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Apresente sua causa.' });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(authMocks.updateUser).not.toHaveBeenCalled();
  });

  it('saves the cause and advances to the visual debut step before preparation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Apresente sua causa.' });
    await fillCause(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledOnce());
    expect(await screen.findByRole('heading', { name: 'Dê um rosto à sua causa.' })).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/ngo/profile?setup=visual');
    expect(authMocks.updateUser.mock.calls[0][0].ngoProfile).toMatchObject({
      category: 'Educação', profileStatus: 'ready', verificationStatus: 'pending',
      payoutStatus: 'not_configured', paymentStatus: 'disabled',
    });
  });

  it('shows logo, three cause photos and the real marketplace preview in step 3B', async () => {
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=visual']}><NGOAccountProfile /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Dê um rosto à sua causa.' })).toBeTruthy();
    expect(screen.getByLabelText('Logo da organização')).toBeTruthy();
    expect(screen.getAllByLabelText(/Foto da causa/)).toHaveLength(3);
    expect(screen.getByText('Veja como sua causa vai aparecer')).toBeTruthy();
    expect(screen.getByTestId('marketplace-card-preview')).toBeTruthy();
  });

  it('keeps the uploaded original as the profile image and reserves the transparent logo for marketplace cards', async () => {
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static createObjectURL = vi.fn(() => 'blob:logo-original');
      static revokeObjectURL = vi.fn();
    });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=visual']}><NGOAccountProfile /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Dê um rosto à sua causa.' });
    await user.upload(
      screen.getByLabelText('Logo da organização'),
      new File(['original'], 'logo-com-fundo.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalled());
    expect(authMocks.updateUser).toHaveBeenCalledWith(expect.objectContaining({
      avatar: '/logo-original-com-fundo.jpg',
    }));
    expect(authMocks.updateUser).not.toHaveBeenCalledWith(expect.objectContaining({
      avatar: '/logo-processada-sem-fundo.png',
    }));
  });

  it('lets the organization do the preparation later and enter its private area', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Apresente sua causa.' });
    await fillCause(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledOnce());
    await screen.findByRole('heading', { name: 'Dê um rosto à sua causa.' });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Prepare sua organização para receber apoio.' });
    await user.click(screen.getByRole('button', { name: 'Fazer depois' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/ngo/profile'));
    expect(screen.getByText('Prepare sua organização para receber apoio')).toBeTruthy();
  });
});
