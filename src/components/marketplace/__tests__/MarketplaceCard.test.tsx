import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import type { NGO } from '@/types';

const ngo: NGO = {
  id: 'visual-cause',
  name: 'Casa Horizonte',
  description: 'Acolhimento perto de quem precisa.',
  category: 'Social',
  goal: 'Abrir um novo espaço.',
  image: '/logo-com-fundo.jpg',
  marketplaceLogo: '/logo-sem-fundo.png',
  coverImage: '/foto-principal.webp',
  email: 'contato@horizonte.org',
  instagram: '',
  verified: true,
  isFounder: true,
  posts: [],
};

describe('MarketplaceCard', () => {
  afterEach(cleanup);
  it('renders the supplied cause photo behind the processed organization logo', () => {
    render(<MarketplaceCard ngo={ngo} saved={false} onToggleSave={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Foto da causa Casa Horizonte' }).getAttribute('src')).toBe('/foto-principal.webp');
    expect(screen.getByRole('img', { name: 'Identidade de Casa Horizonte' }).getAttribute('src')).toBe('/logo-sem-fundo.png');
    expect(screen.getByText('Verificada')).toBeTruthy();
    expect(screen.getByText('Fundadora')).toBeTruthy();
  });

  it('falls back to the original profile logo when no processed card logo exists', () => {
    render(<MarketplaceCard ngo={{ ...ngo, marketplaceLogo: undefined }} saved={false} onToggleSave={vi.fn()} onOpen={vi.fn()} preview />);
    expect(screen.getByRole('img', { name: 'Identidade de Casa Horizonte' }).getAttribute('src')).toBe('/logo-com-fundo.jpg');
  });

  it('uses the organization name when neither logo version was supplied', () => {
    render(<MarketplaceCard ngo={{ ...ngo, image: '', marketplaceLogo: undefined }} saved={false} onToggleSave={vi.fn()} onOpen={vi.fn()} preview />);
    expect(screen.getByLabelText('Identidade textual de Casa Horizonte')).toBeTruthy();
  });
});
