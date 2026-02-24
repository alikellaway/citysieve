'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Thin client component that fires adsbygoogle.push({}) in a useEffect.
 * Kept separate from AdSlot so AdSlot can remain a server component.
 */
export function AdSlotPusher() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Suppress duplicate-push errors that can occur during HMR in dev
    }
  }, []);

  return null;
}
