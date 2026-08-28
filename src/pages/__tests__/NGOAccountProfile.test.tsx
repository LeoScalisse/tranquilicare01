import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NGOAccountProfile from '@/pages/NGOAccountProfile';

const ngoUser = {
  id: 'ngo-new', email: 'contato@horizonte.org', name: 'Instituto Horizonte',
  avatar: null, credits: 0, accountType: 'ngo' as const, ngoProfile: null,
};
const authMocks = vi.hoisted(() => ({ updateUser: vi.fn(), geocodeAddress: vi.fn() }));

vi.mock('@/lib/auth', () => ({
  authReady: Promise.resolve(), getUser: () => ngoUser, onAuthChange: () => () => undefined,
  signOut: vi.fn(), updateUser: authMocks.updateUser,
}));
vi.mock('@/components/AppBottomNav', () => ({ default: () => null }));
vi.mock('@/lib/geocoding', () => ({ geocodeAddress: authMocks.geocodeAddress }));

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
  await user.type(screen.getByLabelText('Por que essa causa existe?'), 'Acreditamos que toda criança merece aprender com segurança.');
  await user.type(screen.getByLabelText('O que vocês fazem?'), 'Oferecemos reforço escolar e acompanhamento para famílias.');
  await user.type(screen.getByLabelText('O que vocês querem tornar possível agora?'), 'Abrir uma nova turma comunitária.');
  await user.type(screen.getByLabelText('Onde vocês atuam?'), 'São Paulo, SP');
};

describe('NGOAccountProfile', () => {
  afterEach(cleanup);
  beforeEach(() => {
    authMocks.updateUser.mockReset();
    authMocks.geocodeAddress.mockReset();
    authMocks.updateUser.mockImplementation(async (patch) => ({ ...ngoUser, ...patch }));
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

  it('saves the cause and advances to the optional preparation step', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Apresente sua causa.' });
    await fillCause(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledOnce());
    expect(await screen.findByRole('heading', { name: 'Prepare sua organização para receber apoio.' })).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/ngo/profile?setup=4');
    expect(authMocks.updateUser.mock.calls[0][0].ngoProfile).toMatchObject({
      category: 'Educação', profileStatus: 'ready', verificationStatus: 'pending',
      payoutStatus: 'not_configured', paymentStatus: 'disabled',
    });
  });

  it('lets the organization do the preparation later and enter its private area', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/ngo/profile?setup=1']}><NGOAccountProfile /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Apresente sua causa.' });
    await fillCause(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Prepare sua organização para receber apoio.' });
    await user.click(screen.getByRole('button', { name: 'Fazer depois' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/ngo/profile'));
    expect(screen.getByText('Prepare sua organização para receber apoio')).toBeTruthy();
  });
});
