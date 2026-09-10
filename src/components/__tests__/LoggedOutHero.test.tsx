import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoggedOutHero from '@/components/LoggedOutHero';
import { loadCommunitySphereProfiles } from '@/lib/communitySphereProfiles';

vi.mock('@/lib/communitySphereProfiles', () => ({ loadCommunitySphereProfiles: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/impact', () => ({ useCountUp: (value: number) => value, formatBRL: (value: number) => `R$ ${value},00` }));
vi.mock('@/components/ui/img-sphere', () => ({
  default: ({ images }: { images: { id: string; alt: string; src: string }[] }) => (
    <div aria-label="Comunidade">{images.map((image) => <img key={image.id} alt={image.alt} src={image.src} />)}</div>
  ),
}));
vi.mock('@/components/discovery/SealRolodex', () => ({ default: () => <span>Verificação</span> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('LoggedOutHero', () => {
  const props = () => ({ communityTotal: 0, communityDonationCount: 0, onExplore: vi.fn(), onStories: vi.fn(), onVerificationDiscovery: vi.fn(), onDonationDiscovery: vi.fn() });

  it('invites discovery without invented profiles or an unsupported payment promise', async () => {
    const callbacks = props();
    render(<LoggedOutHero {...callbacks} />);
    await waitFor(() => expect(loadCommunitySphereProfiles).toHaveBeenCalledOnce());
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByText('Uma comunidade começando uma nova história.')).toBeTruthy();
    expect(screen.queryByText(/100%/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Descobrir causas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conhecer histórias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descobrir como o valor escolhido chega à organização' }));
    expect(callbacks.onExplore).toHaveBeenCalledOnce();
    expect(callbacks.onStories).toHaveBeenCalledOnce();
    expect(callbacks.onDonationDiscovery).toHaveBeenCalledOnce();
  });

  it('lets the reader choose the metric with an accessible selected state', async () => {
    render(<LoggedOutHero {...props()} communityDonationCount={3} />);
    const donations = screen.getByRole('button', { name: 'Mostrar Apoios realizados' });
    expect(donations.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(donations);
    expect(donations.getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(screen.getByText('doações confirmadas')).toBeTruthy();
  });
});
