import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Index from '@/pages/Index';

vi.mock('@/lib/auth', () => ({
  getUser: () => null,
  onAuthChange: () => () => undefined,
  authReady: Promise.resolve(),
  signOut: vi.fn(),
  defaultDestForAccount: () => '/donor/profile',
}));

vi.mock('@/lib/donations', () => ({
  waitForDonationConfirmation: vi.fn(),
}));

vi.mock('@/components/Header', () => ({
  default: () => <header data-testid='header' />,
}));

vi.mock('@/components/ImpactDashboard', () => ({
  default: () => <section data-testid='impact' />,
}));

vi.mock('@/components/Marketplace', () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <section id={embedded ? 'causas' : undefined} data-testid='causes' data-embedded={String(Boolean(embedded))} />
  ),
}));

vi.mock('@/components/Stories', () => ({
  default: () => <section data-testid='stories' />,
}));

vi.mock('@/components/DonationThankYouDialog', () => ({
  default: () => null,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}{location.search}{location.hash}</output>;
};

describe('Index causes section', () => {
  afterEach(cleanup);

  it('keeps causes embedded on home and replaces the old marketplace URL', async () => {
    render(
      <MemoryRouter initialEntries={['/?view=marketplace']}>
        <Index />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/#causas');
    });
    expect(screen.getByTestId('causes').dataset.embedded).toBe('true');
  });
});
