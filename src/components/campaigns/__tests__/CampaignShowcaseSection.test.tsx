import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CampaignShowcaseSection from '@/components/campaigns/CampaignShowcaseSection';
import { loadPublicCampaigns, type PublicCampaign } from '@/lib/campaigns';
import type { NGO } from '@/types';

vi.mock('@/lib/campaigns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaigns')>();
  return { ...actual, loadPublicCampaigns: vi.fn() };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const campaign: PublicCampaign = {
  id: 'campaign-1',
  organizationId: 'ngo-1',
  organizationName: 'Instituto Aurora',
  organizationImage: '/avatar.png',
  organizationCoverImage: '/cover.png',
  title: 'Inverno acolhedor',
  description: 'Cobertores e atendimento para famílias durante o inverno.',
  goalAmountCents: 100_000,
  raisedAmountCents: 25_000,
  endsAt: '2099-12-31T12:00:00.000Z',
  status: 'active',
  coverUrl: '/campaign.png',
};

describe('CampaignShowcaseSection', () => {
  it('expands a compact campaign into real progress stages', async () => {
    vi.mocked(loadPublicCampaigns).mockResolvedValue([campaign]);
    render(
      <CampaignShowcaseSection
        ngos={[{ id: 'ngo-1', name: 'Instituto Aurora' } as NGO]}
        onCreate={vi.fn()}
        onOpenOrganization={vi.fn()}
      />,
    );

    const card = await screen.findByRole('button', { name: /Inverno acolhedor\. 25% da meta/i });
    expect(card.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Proposta aprovada')).toBeNull();

    fireEvent.click(card);

    await waitFor(() => expect(card.getAttribute('aria-expanded')).toBe('true'));
    expect(screen.getByText('Proposta aprovada')).toBeTruthy();
    expect(screen.getByText('Primeiros apoios recebidos')).toBeTruthy();
    expect(screen.getByText(/R\$ 250,00 recebido/)).toBeTruthy();
  });

  it('supports disclosure from the keyboard', async () => {
    vi.mocked(loadPublicCampaigns).mockResolvedValue([campaign]);
    render(
      <CampaignShowcaseSection
        ngos={[]}
        onCreate={vi.fn()}
        onOpenOrganization={vi.fn()}
      />,
    );

    const card = await screen.findByRole('button', { name: /Inverno acolhedor\. 25% da meta/i });
    fireEvent.keyDown(card, { key: ' ' });
    await waitFor(() => expect(card.getAttribute('aria-expanded')).toBe('true'));
  });
});
