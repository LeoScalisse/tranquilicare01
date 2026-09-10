import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NGOProfile from '../NGOProfile';
import { demoNgos } from '@/data/demoNgos';
import { getPlatformAdminAccess } from '@/lib/platformAdmin';
vi.mock('@/lib/auth', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/auth')>(),
  getUser: () => ({id: 'owner-fixture',name:'Conta de teste',email:'fixture@example.com',accountType:'ngo'}),
}));
vi.mock('@/lib/platformAdmin', () => ({getPlatformAdminAccess:vi.fn()}));
vi.mock('@/components/admin/AdminPanel', () => ({default: () => <h2>Relatório privado de teste</h2>}));
afterEach(() => {cleanup(); vi.clearAllMocks();});
const show = (ownerMode = true) => render(<MemoryRouter><NGOProfile ngo={{...demoNgos[0], id:'owner-fixture'}} ownerMode={ownerMode} /></MemoryRouter>);
describe('Private admin tab', () => {
  it('keeps the tab hidden from an ordinary owner', async () => {
    vi.mocked(getPlatformAdminAccess).mockResolvedValue(false);
    show();
    await waitFor(() => expect(getPlatformAdminAccess).toHaveBeenCalled());
    expect(screen.queryByRole('tab', {name:'Admin'})).toBeNull();
  });
  it('does not expose admin on the public profile even for an authorized session', () => {
    vi.mocked(getPlatformAdminAccess).mockResolvedValue(true);
    show(false);
    expect(screen.queryByRole('tab', {name:'Admin'})).toBeNull();
    expect(getPlatformAdminAccess).not.toHaveBeenCalled();
  });
  it('opens the extra tab only after server authorization of the owner', async () => {
    vi.mocked(getPlatformAdminAccess).mockResolvedValue(true);
    show();
    fireEvent.click(await screen.findByRole('tab', {name:'Admin'}));
    expect(await screen.findByRole('heading', {name:'Relatório privado de teste'})).toBeTruthy();
    expect(screen.getByRole('tab', {name:'A Causa'})).toBeTruthy();
  });
});
