import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NGOAccountProfile from '@/pages/NGOAccountProfile';

const ngoUser = {
  id: 'ngo-new',
  email: 'contato@horizonte.org',
  name: 'Instituto Horizonte',
  avatar: null,
  credits: 0,
  accountType: 'ngo' as const,
  ngoProfile: null,
};

const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  geocodeAddress: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authReady: Promise.resolve(),
  getUser: () => ngoUser,
  onAuthChange: () => () => undefined,
  signOut: vi.fn(),
  updateUser: authMocks.updateUser,
}));

vi.mock('@/components/AppBottomNav', () => ({
  default: () => null,
}));

vi.mock('@/lib/geocoding', () => ({
  geocodeAddress: authMocks.geocodeAddress,
}));

describe('NGOAccountProfile', () => {
  afterEach(cleanup);

  beforeEach(() => {
    authMocks.updateUser.mockReset();
    authMocks.geocodeAddress.mockReset();
    authMocks.geocodeAddress.mockResolvedValue({
      latitude: -23.55052,
      longitude: -46.633308,
      displayName: 'Rua das Flores, 120, São Paulo, SP, Brasil',
    });
  });

  it('starts a new organization with only its registered name and an empty setup form', async () => {
    render(
      <MemoryRouter initialEntries={['/ngo/profile?setup=1']}>
        <NGOAccountProfile />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /Complete o perfil da organização/i })).toBeTruthy();
    expect(screen.getByDisplayValue('Instituto Horizonte')).toBeTruthy();
    expect(screen.getByDisplayValue('contato@horizonte.org')).toBeTruthy();
    expect(screen.queryByText('Abraço Sereno')).toBeNull();
    expect(screen.getByLabelText(/Categoria principal/i)).toBeTruthy();
    expect(screen.getByLabelText(/^CNPJ/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Endereço/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sobre a organização/i)).toBeTruthy();
    expect(screen.getByLabelText(/Objetivo atual/i)).toBeTruthy();
    expect(screen.getByLabelText(/Vídeo da causa/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Imagem de capa/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Adicionar objetivo/i })).toBeTruthy();
  });

  it('does not save while CNPJ and address are invalid', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/ngo/profile?setup=1']}>
        <NGOAccountProfile />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Complete o perfil da organização/i });
    await user.click(screen.getByRole('button', { name: /Salvar e visualizar perfil/i }));

    expect(authMocks.updateUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^CNPJ/i).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(/^Endereço/i).getAttribute('aria-invalid')).toBe('true');
  });

  it('persists the institutional fields before revealing the organization profile', async () => {
    const user = userEvent.setup();
    const LocationProbe = () => {
      const location = useLocation();
      return <output data-testid='location'>{location.pathname}{location.search}</output>;
    };
    authMocks.updateUser.mockImplementation(async (patch) => ({ ...ngoUser, ...patch }));

    render(
      <MemoryRouter initialEntries={['/ngo/profile?setup=1']}>
        <NGOAccountProfile />
        <LocationProbe />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Complete o perfil da organização/i });
    await user.click(screen.getByLabelText(/Categoria principal/i));
    await user.click(screen.getByRole('option', { name: 'Educação' }));
    fireEvent.change(screen.getByLabelText(/^CNPJ/i), { target: { value: '11222333000181' } });
    fireEvent.change(screen.getByLabelText(/^Endereço/i), { target: { value: 'Rua das Flores, 120 - Centro, São Paulo - SP' } });
    fireEvent.change(screen.getByLabelText(/Sobre a organização/i), { target: { value: 'Apoio educacional para jovens.' } });
    fireEvent.change(screen.getByLabelText(/Objetivo atual/i), { target: { value: 'Abrir uma nova turma comunitária.' } });
    await user.click(screen.getByRole('button', { name: /Adicionar objetivo/i }));
    fireEvent.change(screen.getByLabelText('Objetivo 1'), { target: { value: 'Formar novos voluntários.' } });
    fireEvent.change(screen.getByLabelText(/Vídeo da causa/i), { target: { value: 'https://youtu.be/G9V69J7cQtY' } });
    fireEvent.change(screen.getByLabelText(/^Instagram/i), { target: { value: '@institutohorizonte' } });
    await user.click(screen.getByRole('button', { name: /Salvar e visualizar perfil/i }));

    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({
        name: 'Instituto Horizonte',
        avatar: null,
        ngoProfile: {
          publicEmail: 'contato@horizonte.org',
          category: 'Educação',
          cnpj: '11222333000181',
          address: 'Rua das Flores, 120 - Centro, São Paulo - SP',
          latitude: -23.55052,
          longitude: -46.633308,
          geocodedAddress: 'Rua das Flores, 120, São Paulo, SP, Brasil',
          status: 'pending',
          description: 'Apoio educacional para jovens.',
          goal: 'Abrir uma nova turma comunitária.',
          objectives: ['Formar novos voluntários.'],
          youtubeUrl: 'https://youtu.be/G9V69J7cQtY',
          coverImage: '',
          instagram: '@institutohorizonte',
          phone: '',
        },
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/ngo/profile');
    });
  });

  it('keeps setup open when the profile was not persisted', async () => {
    const user = userEvent.setup();
    const LocationProbe = () => {
      const location = useLocation();
      return <output data-testid='location'>{location.pathname}{location.search}</output>;
    };
    authMocks.updateUser.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/ngo/profile?setup=1']}>
        <NGOAccountProfile />
        <LocationProbe />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Complete o perfil da organização/i });
    await user.click(screen.getByLabelText(/Categoria principal/i));
    await user.click(screen.getByRole('option', { name: 'Educação' }));
    fireEvent.change(screen.getByLabelText(/^CNPJ/i), { target: { value: '11222333000181' } });
    fireEvent.change(screen.getByLabelText(/^Endereço/i), { target: { value: 'Rua das Flores, 120 - Centro, São Paulo - SP' } });
    fireEvent.change(screen.getByLabelText(/Sobre a organização/i), { target: { value: 'Apoio educacional para jovens.' } });
    fireEvent.change(screen.getByLabelText(/Objetivo atual/i), { target: { value: 'Abrir uma nova turma comunitária.' } });
    await user.click(screen.getByRole('button', { name: /Salvar e visualizar perfil/i }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledOnce());
    expect(screen.getByTestId('location').textContent).toBe('/ngo/profile?setup=1');
    expect(screen.getByRole('heading', { name: /Complete o perfil da organização/i })).toBeTruthy();
  });
});
