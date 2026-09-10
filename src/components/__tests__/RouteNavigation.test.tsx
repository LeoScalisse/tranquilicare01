import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RouteNavigation from '../RouteNavigation';
import AppBottomNav from '../AppBottomNav';
import Header from '../Header';
import { View } from '@/types';
import { getUser } from '@/lib/auth';
vi.mock('@/lib/auth', () => ({
  getUser: vi.fn(() => null), authReady: Promise.resolve(), onAuthChange: () => () => {},
  defaultDestForAccount: (type: string) => type === 'ngo' ? '/ngo/profile' : '/donor/profile', signOut: vi.fn(),
}));
afterEach(() => { cleanup(); vi.mocked(getUser).mockReturnValue(null); });
function Screen() {
  const location = useLocation();
  return <RouteNavigation location={location}><main><output data-testid='location'>{location.pathname + location.search}</output><AppBottomNav activeKey={null} user={null} /></main></RouteNavigation>;
}
describe('Shared route navigation', () => {
  it.each(['donor', 'ngo'] as const)('opens the correct profile for a %s account', accountType => {
    vi.mocked(getUser).mockReturnValue({id:'fixture',name:'Pessoa de teste',email:'fixture@example.com',accountType} as ReturnType<typeof getUser>);
    render(<MemoryRouter initialEntries={['/chats']}><Screen /></MemoryRouter>);
    const desktop = within(screen.getByRole('navigation', {name:'Navegação principal no computador'}));
    fireEvent.click(desktop.getByRole('button', {name:accountType === 'ngo' ? 'Perfil da ONG' : 'Meu perfil'}));
    expect(screen.getByTestId('location').textContent).toBe(`/${accountType}/profile`);
  });
  it.each(['/chats','/ngo/profile','/donor/profile','/campaign/new','/perfil/example','/ong/example','/donor/auth','/descobertas/verificacao','/missing'])('keeps destinations and only one mobile menu on %s', path => {
    render(<MemoryRouter initialEntries={[path]}><Screen /></MemoryRouter>);
    const desktop = within(screen.getByRole('navigation', { name: 'Navegação principal no computador' }));
    for (const label of ['Histórias','Chat','Entrar']) expect(desktop.getByRole('button', {name:label})).toBeTruthy();
    expect(desktop.queryByRole('button', {name:'Início'})).toBeNull();
    expect(screen.getAllByRole('navigation', {name:'Navegação principal'})).toHaveLength(1);
  });
  it('opens stories directly from the chat and marks the current section', () => {
    render(<MemoryRouter initialEntries={['/chats']}><Screen /></MemoryRouter>);
    const desktop = within(screen.getByRole('navigation', { name: 'Navegação principal no computador' }));
    expect(desktop.getByRole('button', {name:'Chat'}).getAttribute('aria-current')).toBe('page');
    expect(desktop.getByRole('button', {name:'Histórias'}).className).toContain('tc-button-secondary');
    fireEvent.click(desktop.getByRole('button', {name:'Histórias'}));
    expect(screen.getByTestId('location').textContent).toBe('/?view=stories');
  });
  it('returns to the home page through the logo', () => {
    render(<MemoryRouter initialEntries={['/chats']}><Screen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', {name:'TranquiliCare — início'}));
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
  it('uses the primary blue pattern for the active stories button', () => {
    render(<Header currentView={View.STORIES} setCurrentView={vi.fn()} />);
    const desktop = within(screen.getByRole('navigation', { name: 'Navegação principal no computador' }));
    const stories = desktop.getByRole('button', {name:'Histórias'});
    expect(stories.className).toContain('tc-button-3d');
    expect(stories.className).not.toContain('bg-brand-yellow');
    expect(stories.getAttribute('aria-current')).toBe('page');
  });
});
