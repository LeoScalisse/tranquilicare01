import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FounderCarousel from '../ui/founder-carousel';
afterEach(cleanup);
const slides = ['Ana', 'Bia', 'Cris'].map((label) => ({ id: label, label, content: <button>{label}</button>, preview: <span>Foto</span> }));
describe('Founder carousel', () => {
  it('navigates with buttons and keyboard', () => {
    render(<FounderCarousel slides={slides} />);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima organização' }));
    expect(screen.getByRole('button', { name: 'Bia' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('region'), { key: 'End' });
    expect(screen.getByRole('button', { name: 'Cris' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima organização' }));
    expect(screen.getByRole('button', { name: 'Ana' })).toBeTruthy();
  });
  it('renders a single organization without redundant navigation', () => {
    render(<FounderCarousel slides={slides.slice(0, 1)} />);
    expect(screen.queryByRole('button', { name: 'Próxima organização' })).toBeNull();
  });
  it('removes the visual counter but announces the current organization', () => {
    render(<FounderCarousel slides={slides.slice(0, 2)} />);
    expect(screen.queryByText('01')).toBeNull();
    expect(screen.queryByText('/ 02')).toBeNull();
    const status = screen.getByText('1 de 2: Ana');
    expect(status.className).toBe('sr-only');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
  it('selects a preview and keeps navigation correct across the loop boundary', () => {
    render(<FounderCarousel slides={slides} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver Cris' }));
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('3 de 3: Cris');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima organização' }));
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('1 de 3: Ana');
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('3 de 3: Cris');
  });
  it('accepts a horizontal swipe but leaves vertical scrolling alone', () => {
    const { container } = render(<FounderCarousel slides={slides} />);
    const viewport = container.querySelector('.founder-carousel-viewport')!;
    Object.assign(viewport, { setPointerCapture: vi.fn(), hasPointerCapture: () => false });
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperties(event, { isPrimary: { value: true }, pointerId: { value: 1 } });
      fireEvent(viewport, event);
    };
    pointer('pointerdown', 160, 100);
    pointer('pointermove', 150, 200);
    pointer('pointerup', 150, 200);
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('1 de 3: Ana');
    pointer('pointerdown', 160, 100);
    pointer('pointermove', 60, 105);
    pointer('pointerup', 60, 105);
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('2 de 3: Bia');
  });
  it('handles removal of slides and an empty result', () => {
    const { rerender } = render(<FounderCarousel slides={slides} />);
    fireEvent.keyDown(screen.getByRole('region'), { key: 'End' });
    rerender(<FounderCarousel slides={slides.slice(0, 1)} />);
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('1 de 1: Ana');
    rerender(<FounderCarousel slides={[]} />);
    expect(screen.queryByRole('region')).toBeNull();
  });

});
