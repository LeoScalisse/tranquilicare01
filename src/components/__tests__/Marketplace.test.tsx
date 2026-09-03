import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Marketplace from '@/components/Marketplace';
import { demoNgos } from '@/data/demoNgos';
import { TRANQUILICARE_FOUNDER_NGO } from '@/data/tranquilicarePrototype';

describe('Marketplace editorial sections', () => {
  afterEach(cleanup);

  it('shows editorial cause sections with category-colored bands', () => {
    const openNgo = vi.fn();
    const { container } = render(
      <Marketplace
        ngos={demoNgos}
        founderNgo={TRANQUILICARE_FOUNDER_NGO}
        onSelectNGO={openNgo}
        onSupportNGO={vi.fn()}
        onCampaignInterest={vi.fn().mockResolvedValue(true)}
        onCategorySealOpen={vi.fn()}
        embedded
      />,
    );

    [
      'Quem acredita nessa história desde o começo',
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
    expect(screen.getAllByText('Vaquinhas').length).toBeGreaterThan(0);
    expect(screen.getByText(
      'Campanhas feitas com propósito, em breve.',
    )).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Saúde Mental' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Para ninguém enfrentar tudo sozinho' })).not.toBeNull();
    expect(screen.getByText('Para ninguém enfrentar tudo sozinho').closest('section')?.className).toContain('bg-[#FFE89A]');
    expect(screen.getByText('Para quem alegra nossos dias').closest('section')?.className).toContain('bg-[#FFD4BD]');
    expect(screen.queryByText('Relâmpago')).toBeNull();
    expect(screen.getByRole('region', { name: 'Carrossel de organizações fundadoras' })).not.toBeNull();
    expect(screen.getByText(TRANQUILICARE_FOUNDER_NGO.description)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Conhecer TranquiliCare' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Conhecer TranquiliCare' }));
    expect(openNgo).toHaveBeenCalledWith(TRANQUILICARE_FOUNDER_NGO);
    expect(screen.getByAltText('Selo de ONG fundadora')).not.toBeNull();
    expect(screen.queryByText(/Conheça a organização fundadora/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /Conhecer a causa/i }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('article').length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: 'Todas' }).className).toContain('order-1');
    expect(screen.getByRole('button', { name: 'Vaquinhas' }).className).toContain('order-2');
    expect(screen.getByRole('button', { name: 'Educação' }).className).toContain('order-3');
    const cowFilter = screen.getByRole('button', { name: 'Vaquinhas' });
    const founderHeading = screen.getByText('Quem acredita nessa história desde o começo');
    expect(founderHeading).not.toBeNull();
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Quero criar uma vaquinha' })).not.toBeNull();
    expect(container.querySelector('[data-cow-campaign-section]')).toBeNull();
    fireEvent.click(cowFilter);
    expect(cowFilter.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Quem acredita nessa história desde o começo')).toBeTruthy();
  });

  it('shows interactive seal cards for categories with no registered organizations', async () => {
    const openSeal = vi.fn();
    render(
      <Marketplace
        ngos={[]}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        onCampaignInterest={vi.fn().mockResolvedValue(true)}
        onCategorySealOpen={openSeal}
        embedded
      />,
    );

    expect(screen.getByRole('heading', { name: 'Para quem alegra nossos dias' })).not.toBeNull();
    expect(screen.getByAltText('Selo de Pets')).not.toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Conhecer o selo da categoria Pets' })[0]);
    expect(openSeal).toHaveBeenCalledOnce();

    expect(screen.queryByRole('button', { name: 'Ver novidades de Pets' })).toBeNull();
    expect(screen.getByText('Ainda estamos buscando causas e histórias para Para quem alegra nossos dias.')).not.toBeNull();
    expect(screen.queryByText('Uma nova causa pode nascer aqui.')).toBeNull();
    expect(screen.queryByText('Voltaremos com novidades em breve.')).toBeNull();
  });

  it('keeps a founder organization inside its cause category as well as the founder section', () => {
    const founder = { ...demoNgos[0], isFounder: true };
    render(
      <Marketplace
        ngos={[founder]}
        founderNgos={[founder]}
        onSelectNGO={vi.fn()}
        onSupportNGO={vi.fn()}
        onCategorySealOpen={vi.fn()}
        embedded
      />,
    );

    expect(screen.getByRole('region', { name: 'Carrossel de organizações fundadoras' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Para ninguém enfrentar tudo sozinho' })).not.toBeNull();
    expect(screen.getAllByText(founder.name).length).toBeGreaterThan(1);
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
