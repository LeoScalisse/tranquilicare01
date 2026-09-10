import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StoryBody from '../ui/story-body';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Story body', () => {
  it('does not offer expansion for short text', () => {
    render(<StoryBody text='Uma pequena conquista.' />);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('expands overflowing lines and can collapse without losing the text', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(420);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(140);
    render(<StoryBody text={'Uma história longa. '.repeat(80)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ler mais' }));
    const less = screen.getByRole('button', { name: 'Ler menos' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(less.getAttribute('aria-controls')!)?.className).not.toContain('line-clamp');
    fireEvent.click(less);
    expect(screen.getByRole('button', { name: 'Ler mais' }).getAttribute('aria-expanded')).toBe('false');
  });
});
