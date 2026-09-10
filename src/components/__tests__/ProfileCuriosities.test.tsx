import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileCuriosities } from '../ProfileCuriosities';
import { normalizeProfileAnswers } from '@/lib/profilePrompts';
afterEach(cleanup);
describe('Profile curiosities', () => {
  it('renders only volunteered public answers', () => {
    render(<ProfileCuriosities answers={{ joy: 'Caminhar com meu cachorro.' }} />);
    expect(screen.getByText('Caminhar com meu cachorro.')).toBeTruthy();
    expect(screen.queryByText('O que me inspira a ajudar')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('lets people choose a prompt without requiring the rest', () => {
    const onChange = vi.fn();
    render(<ProfileCuriosities onChange={onChange} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Uma curiosidade sobre mim' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Uma curiosidade sobre mim' }), { target: { value: 'Tenho uma horta.' } });
    expect(onChange).toHaveBeenCalledWith({ curiosity: 'Tenho uma horta.' });
  });
  it('closes a prompt when its question is clicked again without discarding the draft', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ProfileCuriosities answers={{ curiosity: 'Tenho uma horta.' }} onChange={onChange} />);
    const question = screen.getByRole('button', { name: 'Uma curiosidade sobre mim' });
    fireEvent.click(question);
    expect((screen.getByRole('textbox', { name: 'Uma curiosidade sobre mim' }) as HTMLTextAreaElement).value).toBe('Tenho uma horta.');
    fireEvent.click(question);
    expect(screen.queryByRole('textbox', { name: 'Uma curiosidade sobre mim' })).toBeNull();
    rerender(<ProfileCuriosities answers={{ curiosity: 'Tenho uma horta.' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Uma curiosidade sobre mim' }));
    expect((screen.getByRole('textbox', { name: 'Uma curiosidade sobre mim' }) as HTMLTextAreaElement).value).toBe('Tenho uma horta.');
  });
  it('ignores unknown fields, blanks and non-text values', () => {
    expect(normalizeProfileAnswers({ joy: '  Sol  ', music: ' ', phone: '1234', talent: 3 })).toEqual({ joy: 'Sol' });
    expect(normalizeProfileAnswers({ joy: 'a'.repeat(300) }).joy).toHaveLength(240);
  });
});
