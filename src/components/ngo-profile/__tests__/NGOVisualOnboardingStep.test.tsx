import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NGOVisualOnboardingStep from '@/components/ngo-profile/NGOVisualOnboardingStep';
import type { NGO } from '@/types';

vi.mock('@/lib/organizationVisualMedia', () => ({
  analyzeMarketplacePhotoFiles: vi.fn().mockResolvedValue(0),
}));

const organization: NGO = {
  id: 'preview',
  name: 'Casa Horizonte',
  description: 'Acolhimento perto de quem precisa.',
  category: 'Social',
  goal: 'Abrir um novo espaço.',
  image: '',
  email: 'contato@horizonte.org',
  instagram: '',
  verified: false,
  posts: [],
};

describe('NGOVisualOnboardingStep', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:visual-preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('requires the image authorization only after media is selected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NGOVisualOnboardingStep organization={organization} saving={false} onSubmit={onSubmit} />);

    await user.upload(screen.getByLabelText('Logo da organização'), new File(['logo'], 'logo.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('alert').textContent).toContain('Confirme a autorização');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('allows continuing without uploads so visual processing never blocks onboarding', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NGOVisualOnboardingStep organization={organization} saving={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photoFiles: [], authorized: false }));
  });
});
