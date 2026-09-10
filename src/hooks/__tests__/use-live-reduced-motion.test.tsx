import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLiveReducedMotion } from '../use-live-reduced-motion';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('live reduced motion preference', () => {
  it('updates during the session and releases its listener on unmount', () => {
    let reduced = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return reduced; },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }));
    const { result, unmount } = renderHook(useLiveReducedMotion);
    expect(result.current).toBe(false);
    act(() => { reduced = true; listeners.forEach(listener => listener()); });
    expect(result.current).toBe(true);
    act(() => { reduced = false; listeners.forEach(listener => listener()); });
    expect(result.current).toBe(false);
    unmount();
    expect(listeners.size).toBe(0);
  });

  it('chooses the static alternative when media queries are unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(useLiveReducedMotion).result.current).toBe(true);
  });
});
