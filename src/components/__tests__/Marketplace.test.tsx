import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Marketplace from '@/components/Marketplace';
import { demoNgos } from '@/data/demoNgos';

describe('Marketplace editorial sections', () => {
  afterEach(cleanup);

  it('shows editorial cause sections with category-colored bands', () => {
    const { container } = render(
      <Marketplace
        ngos={demoNgos}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        embedded
      />,
    );

    [
      'Causas para conhecer',
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
    expect(screen.getAllByRole('button', { name: /Conhecer a causa/i }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('article').length).toBeGreaterThan(0);

    const cowFilter = screen.getByRole('button', { name: 'Vaquinhas' });
    expect(cowFilter.querySelector('[data-cow-head]')).not.toBeNull();
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('true');
    const cowSection = container.querySelector('[data-cow-campaign-section]');
    expect(cowSection?.className).toContain('bg-white');
    expect(cowSection?.className).not.toContain('bg-[#FFD5C2]');
    expect(cowSection?.querySelectorAll('[data-cow-spot]').length).toBeGreaterThanOrEqual(8);
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Causas para conhecer')).toBeTruthy();
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
