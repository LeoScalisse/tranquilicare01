import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TimedUndoAction from '@/components/ui/timed-undo-action';

describe('TimedUndoAction', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('lets the user cancel before the destructive action', () => {
    vi.useFakeTimers();
    const confirm = vi.fn();
    render(<TimedUndoAction initialSeconds={2} onConfirm={confirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(screen.getByRole('button', { name: /Cancelar exclusão/ })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar exclusão/ }));
    act(() => vi.advanceTimersByTime(3000));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('confirms only after the countdown finishes', async () => {
    vi.useFakeTimers();
    const confirm = vi.fn().mockResolvedValue(undefined);
    render(<TimedUndoAction initialSeconds={2} onConfirm={confirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(confirm).toHaveBeenCalledOnce();
  });
});