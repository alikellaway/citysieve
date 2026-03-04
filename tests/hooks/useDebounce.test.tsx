/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'initial' },
    });

    rerender({ val: 'changed' });
    
    // Value should still be initial
    expect(result.current).toBe('initial');
    
    // Advance timer by 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });
    
    // Still initial
    expect(result.current).toBe('initial');
  });

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'initial' },
    });

    rerender({ val: 'changed' });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe('changed');
  });

  it('rapid changes cancel prior timer; only last value emitted', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'initial' },
    });

    rerender({ val: 'first change' });
    
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ val: 'second change' });
    
    act(() => {
      vi.advanceTimersByTime(150); // total 300ms since first change
    });
    
    // Still initial because the first timer was cancelled
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(150); // total 300ms since second change
    });
    
    expect(result.current).toBe('second change');
  });
});
