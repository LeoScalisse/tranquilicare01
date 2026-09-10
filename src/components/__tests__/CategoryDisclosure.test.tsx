import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CategoryDisclosure } from '../ui/category-disclosure';

beforeAll(() => vi.stubGlobal('PointerEvent', MouseEvent));
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);
const items = [{ id: '', label: 'TranquiliCare', tone: 'brand' as const }, { id: 'pets', label: 'Pets' }, { id: 'educacao', label: 'Educação' }];
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return <CategoryDisclosure id='test-category' items={items} value={value} onChange={setValue} disabled={disabled} aria-label='Categoria da história' />;
}
describe('Shared category disclosure', () => {
  it('selects and clears a category with the keyboard, restoring trigger focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Categoria da história' });
    expect(trigger.className).toContain('linear-gradient');
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'TranquiliCare' }).className).toContain('linear-gradient');
    await user.keyboard('{End}{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(trigger.textContent).toContain('Educação');
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    await user.keyboard('{Home}{Enter}');
    expect(trigger.textContent).toContain('TranquiliCare');
  });
  it('dismisses without changing the selection and cannot open when disabled', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Categoria da história' });
    await user.click(trigger);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.textContent).toContain('TranquiliCare');
    rerender(<Harness disabled />);
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
