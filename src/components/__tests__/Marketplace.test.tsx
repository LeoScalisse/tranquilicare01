import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Marketplace from '@/components/Marketplace';
import { demoNgos } from '@/data/demoNgos';
import { TRANQUILICARE_FOUNDER_NGO } from '@/data/tranquilicarePrototype';

describe('Marketplace editorial sections', () => {
  afterEach(cleanup);

  it('shows editorial cause sections with category-colored bands', () => {
    const { container } = render(
      <Marketplace
        ngos={demoNgos}
        founderNgo={TRANQUILICARE_FOUNDER_NGO}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        embedded
      />,
    );

    [
      'Quem acreditou nessa história desde o começo',
      'Novas histórias por aqui',
      'Onde o futuro começa',
      'Cuidado que chega a quem precisa',
      'Para ninguém enfrentar tudo sozinho',
      'Mudanças que começam perto',
      'Para quem alegra nossos dias',
      'Cuidar do lugar que todos chamamos de casa',
    ].forEach((title) => {
      expect(screen.getByText(title)).not.toBeNull();
    });

    expect(screen.getByText('Busque uma causa...')).not.toBeNull();
    expect(screen.getByText('Vaquinhas')).not.toBeNull();
    expect(screen.getByText(
      'Campanhas com um objetivo e um tempo para acontecer.',
    )).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Saúde Mental' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Para ninguém enfrentar tudo sozinho' })).not.toBeNull();
    expect(screen.getByText('Para ninguém enfrentar tudo sozinho').closest('section')?.className).toContain('bg-[#FFE89A]');
    expect(screen.getByText('Para quem alegra nossos dias').closest('section')?.className).toContain('bg-[#FFD4BD]');
    expect(screen.queryByText('Relâmpago')).toBeNull();
    expect(screen.getByRole('region', { name: 'Carrossel de organizações fundadoras' })).not.toBeNull();
    expect(screen.getByText(TRANQUILICARE_FOUNDER_NGO.description)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Conhecer TranquiliCare' })).not.toBeNull();
    expect(screen.getByAltText('Selo de ONG fundadora')).not.toBeNull();
    expect(screen.queryByText(/Conheça a organização fundadora/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /Conhecer a causa/i }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('article').length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: 'Todas' }).className).toContain('order-1');
    expect(screen.getByRole('button', { name: 'Vaquinhas' }).className).toContain('order-2');
    expect(screen.getByRole('button', { name: 'Educação' }).className).toContain('order-3');
    const cowFilter = screen.getByRole('button', { name: 'Vaquinhas' });
    const initialCowSection = container.querySelector('[data-cow-campaign-section]');
    const founderHeading = screen.getByText('Quem acreditou nessa história desde o começo');
    expect(initialCowSection?.compareDocumentPosition(founderHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(cowFilter.querySelector('[data-cow-head]')).not.toBeNull();
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('true');
    const cowSection = container.querySelector('[data-cow-campaign-section]');
    expect(cowSection?.className).toContain('bg-white');
    expect(cowSection?.className).not.toContain('bg-[#FFD5C2]');
    expect(cowSection?.querySelectorAll('[data-cow-spot]').length).toBeGreaterThanOrEqual(8);
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Quem acreditou nessa história desde o começo')).toBeTruthy();
  });

  it('shows interactive seal cards for categories with no registered organizations', async () => {
    render(
      <Marketplace
        ngos={[]}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        embedded
      />,
    );

    expect(screen.getByRole('heading', { name: 'Para quem alegra nossos dias' })).not.toBeNull();
    expect(screen.getByAltText('Selo de Pets')).not.toBeNull();

    const petsCard = screen.getByRole('button', { name: 'Ver novidades de Pets' });
    expect(petsCard.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(petsCard);

    expect(petsCard.getAttribute('aria-expanded')).toBe('true');
    await waitFor(() => expect(screen.getByText('Ainda estamos buscando causas e histórias para Para quem alegra nossos dias.')).not.toBeNull());
  });
  it('keeps every cause category filter available before organizations are registered', () => {
    render(
      <Marketplace
        ngos={[]}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        embedded
      />,
    );

    ['Educação', 'Saúde', 'Saúde Mental', 'Social', 'Pets', 'Meio Ambiente'].forEach((category) => {
      expect(screen.getByRole('button', { name: category })).not.toBeNull();
    });
  });

  it('uses the new empty-state copy when no cause matches', () => {
    render(
      <Marketplace
        ngos={demoNgos}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        embedded
      />,
    );

    fireEvent.change(screen.getByLabelText('Buscar causas ou organizações'), {
      target: { value: 'causa inexistente xyz' },
    });

    expect(screen.getByText('Não encontramos nenhuma causa por aqui.')).not.toBeNull();
    expect(screen.getByText('Tente outro termo ou explore uma categoria.')).not.toBeNull();
  });
});
