import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NGOPublicProfile from '@/pages/NGOPublicProfile';

vi.mock('@/lib/auth', () => ({
  authReady: Promise.resolve(),
  defaultDestForAccount: () => '/donor/profile',
  getUser: vi.fn(() => null),
  onAuthChange: () => () => {},
}));

vi.mock('@/lib/ngos', () => ({
  loadNgoById: vi.fn(async () => ({
    id: 'ngo-example',
    name: 'ONG de exemplo',
  })),
}));

vi.mock('@/components/NGOProfile', () => ({
  default: () => <main>Perfil da organização</main>,
}));

vi.mock('@/components/AppBottomNav', () => ({
  default: () => null,
}));

describe('NGOPublicProfile navigation', () => {
  afterEach(cleanup);

  it('keeps its contextual return header exclusive to mobile screens', async () => {
    render(
      <MemoryRouter initialEntries={['/ong/ngo-example']}>
        <Routes>
          <Route path='/ong/:ngoId' element={<NGOPublicProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Perfil da organização');
    expect(screen.getByRole('banner').className).toContain('md:hidden');
  });
});
