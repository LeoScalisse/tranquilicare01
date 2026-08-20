import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import NGOProfile from '@/components/NGOProfile';
import { demoNgos } from '@/data/demoNgos';

const renderProfile = (ngo = demoNgos[0], ownerMode = false) => render(
  <MemoryRouter>
    <NGOProfile ngo={ngo} ownerMode={ownerMode} />
  </MemoryRouter>,
);

describe('NGOProfile cause-led architecture', () => {
  afterEach(cleanup);

  it('opens on A Causa without the old dashboard summary', () => {
    renderProfile();

    expect(screen.getByRole('tab', { name: 'A Causa' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByText(demoNgos[0].description)).toHaveLength(1);
    expect(screen.getByText(demoNgos[0].goal)).not.toBeNull();
    expect(screen.getByText('Objetivo atual')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Apoiar esta causa/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /Falar com a organização/i })).not.toBeNull();
    expect(screen.queryByText('Organização verificada')).toBeNull();
    expect(screen.queryByText('Continue perto desta causa')).toBeNull();
    expect(screen.queryByText('Informações')).toBeNull();
    expect(screen.queryByText('Meta atual')).toBeNull();
    expect(screen.queryByText('Transparência')).toBeNull();
    expect(screen.queryByText('impactos publicados')).toBeNull();
  });

  it('opens the objective modal with the category color', () => {
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /Conhecer o objetivo da causa/i }));

    const dialog = screen.getByRole('dialog', { name: 'O que queremos tornar possível' });
    expect(dialog.textContent).toContain(demoNgos[0].goal);
    expect(dialog.firstElementChild?.className).toContain('bg-[#FFF7D6]');
  });

  it('expands the Abraço Sereno cause video and closes it with Escape', async () => {
    renderProfile();

    const trigger = screen.getByRole('button', { name: 'Assistir ao vídeo da causa Abraço Sereno' });
    expect(trigger.querySelector('video')?.getAttribute('src')).toContain('video-player.mp4');

    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'A causa de Abraço Sereno em movimento' });
    expect(dialog.closest('[data-video-overlay]')?.parentElement).toBe(document.body);
    expect(dialog.querySelector('video')?.hasAttribute('controls')).toBe(true);
    const closeButton = dialog.querySelector('button');
    await waitFor(() => {
      expect(document.activeElement).toBe(closeButton);
    });

    fireEvent.keyDown(closeButton!, { key: 'Escape' });
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('centers the cause video with breathing room below the profile tabs', () => {
    renderProfile();

    const region = screen.getByTestId('cause-video-region');
    expect(region.className).toContain('justify-center');
    expect(region.className).toContain('pt-6');
  });

  it('does not render a cause video when the organization has none', () => {
    renderProfile(demoNgos[1]);

    expect(screen.queryByRole('button', { name: /Assistir ao vídeo da causa/i })).toBeNull();
  });

  it('keeps stories and impact as different experiences', async () => {
    renderProfile();

    fireEvent.click(screen.getByRole('tab', { name: 'Histórias' }));
    expect(await screen.findByRole('heading', { name: 'Veja nossa causa em movimento' })).not.toBeNull();
    expect(screen.queryByText('Acompanhe o trabalho da organização pelas histórias que ela escolheu compartilhar.')).toBeNull();
    expect(await screen.findByText('1 história publicada')).not.toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Impacto' }));
    expect(await screen.findByRole('heading', { name: 'O que já tornamos possível juntos' })).not.toBeNull();
    expect(await screen.findByText('Esta organização ainda não compartilhou seus resultados por aqui.')).not.toBeNull();
    expect(await screen.findByText('Quando novos números forem publicados, você poderá acompanhá-los aqui.')).not.toBeNull();
    expect(screen.queryByText('História recente')).toBeNull();
    expect(screen.queryByText('Impacto que ganhou forma')).toBeNull();
    expect(screen.queryByText(demoNgos[0].posts[0].caption!)).toBeNull();
  });

  it('supports real impact metrics without deriving them from the goal', async () => {
    renderProfile({
      ...demoNgos[0],
      impactMetrics: [{
        id: 'test-direct-result',
        value: 1240,
        label: 'pessoas acolhidas',
        measurementType: 'direct',
        source: 'Relatório mensal da organização',
        updatedAt: '2026-07-01',
      }],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Impacto' }));
    expect(await screen.findByText('1.240')).not.toBeNull();
    expect(await screen.findByText('pessoas acolhidas')).not.toBeNull();
    expect(await screen.findByText('Resultado informado')).not.toBeNull();
    expect(await screen.findByText('Relatório mensal da organização')).not.toBeNull();
  });

  it('supports arrow-key navigation between tabs', () => {
    renderProfile();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A Causa' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Histórias' }).getAttribute('aria-selected')).toBe('true');
  });
});
