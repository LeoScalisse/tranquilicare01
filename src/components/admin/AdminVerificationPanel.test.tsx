import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminVerificationPanel from './AdminVerificationPanel';
import { listAdminOrganizationVerifications, reviewAdminOrganizationVerification, type AdminOrganizationVerification } from '@/lib/platformAdmin';

vi.mock('@/lib/platformAdmin', () => ({
  listAdminOrganizationVerifications: vi.fn(),
  reviewAdminOrganizationVerification: vi.fn(),
}));

const verification: AdminOrganizationVerification = {
  organization_id: 'organization-id',
  name: 'Instituto Esperança',
  public_email: 'contato@example.com',
  cnpj: '12345678000190',
  address: 'Rua da Paz, 10',
  city: 'São Paulo',
  state: 'SP',
  organization_status: 'pending',
  verification_status: 'in_review',
  submitted_at: '2026-09-10T12:00:00Z',
  reviewed_at: null,
  reviewed_by: null,
  internal_notes: null,
  updated_at: '2026-09-10T12:00:00Z',
  document_count: 1,
  accepted_document_count: 1,
  mercado_pago_connected: true,
  payout_status: 'configured',
  payment_status: 'disabled',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminVerificationPanel', () => {
  it('confirms approval before persisting the real decision', async () => {
    vi.mocked(listAdminOrganizationVerifications).mockResolvedValue({ total: 1, verifications: [verification] });
    vi.mocked(reviewAdminOrganizationVerification).mockResolvedValue();
    render(<AdminVerificationPanel />);

    expect(await screen.findByText('Instituto Esperança')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar organização' }));
    expect(reviewAdminOrganizationVerification).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));

    await waitFor(() => expect(reviewAdminOrganizationVerification).toHaveBeenCalledWith('organization-id', 'approved', ''));
  });

  it('requires a reason before requesting corrections', async () => {
    vi.mocked(listAdminOrganizationVerifications).mockResolvedValue({ total: 1, verifications: [verification] });
    render(<AdminVerificationPanel />);
    await screen.findByText('Instituto Esperança');

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar correções' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }));
    expect(reviewAdminOrganizationVerification).not.toHaveBeenCalled();
  });
});
