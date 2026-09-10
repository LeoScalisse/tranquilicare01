import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminPanel from './AdminPanel';
import { listAdminUsers, listAdminDonations, type AdminUser } from '@/lib/platformAdmin';
vi.mock('@/lib/platformAdmin', () => ({ listAdminUsers: vi.fn(), listAdminDonations: vi.fn() }));
const person: AdminUser = { id: 'test-user', name: 'Pessoa de teste', email: 'teste@example.com', account_type: 'donor', created_at: '2026-09-10T12:00:00Z', donation_count: 2, donated_cents: 5000, received_cents: 0, story_count: 3, conversation_count: 4, sent_message_count: 8, received_message_count: 7 };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Admin reports', () => {
  it('loads real report results and requests donation details only when opened', async () => {
    vi.mocked(listAdminUsers).mockResolvedValue({ total: 1, users: [person] });
    vi.mocked(listAdminDonations).mockResolvedValue({ total: 0, donations: [] });
    render(<AdminPanel />);
    expect(await screen.findByText(person.email)).toBeTruthy();
    expect(screen.getByText('8 / 7')).toBeTruthy();
    expect(listAdminDonations).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ver doações de/ }));
    expect(await screen.findByText('Nenhuma doação registrada para esta conta.')).toBeTruthy();
    expect(listAdminDonations).toHaveBeenCalledWith(person.id, 0);
  });
  it('submits filters and recovers from a denied or failed report without fake users', async () => {
    vi.mocked(listAdminUsers).mockRejectedValueOnce(new Error('admin_access_denied')).mockResolvedValue({ total: 0, users: [] });
    render(<AdminPanel />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Nenhum usuário corresponde a esses filtros.');
    fireEvent.change(screen.getByLabelText('Nome ou e-mail'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(listAdminUsers).toHaveBeenLastCalledWith('Ana', 'all', 0));
  });
});
