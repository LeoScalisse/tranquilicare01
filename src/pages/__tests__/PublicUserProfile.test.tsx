import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicUserProfile from '../PublicUserProfile';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/auth', () => ({ getUser: () => null }));
const author = { id: 'donor-1', name: 'Ana Souza', bio: 'Gosto de estar perto.', profile_answers: { joy: 'Caminhar.', phone: '1234' } };
const Location = () => { const location = useLocation(); return <output>{location.pathname}{location.search}</output>; };
function setup() { render(<MemoryRouter initialEntries={['/profile/donor-1']}><Routes><Route path='/profile/:profileId' element={<PublicUserProfile />} /><Route path='/chats' element={<Location />} /></Routes></MemoryRouter>); }
afterEach(cleanup);
beforeEach(() => mocks.rpc.mockReset().mockResolvedValue({ data: [author], error: null }));
describe('Public donor profile', () => {
  it('shows volunteered answers and opens the existing chat route', async () => {
    setup();
    expect(await screen.findByText('Caminhar.')).toBeTruthy();
    expect(screen.queryByText('1234')).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('get_public_donor_profile', { requested_profile_id: 'donor-1' });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar conversa' }));
    expect(screen.getByText('/chats?profile=donor-1')).toBeTruthy();
  });
  it('offers recovery after a failed request', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Caminhar.')).toBeTruthy();
  });
  it('handles a missing donor', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    setup();
    expect(await screen.findByRole('heading', { name: 'Perfil indisponível' })).toBeTruthy();
  });
});
