'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const COOKIE_CONSENT_KEY = 'citysieve-cookie-consent';

/**
 * Sitewide cookie consent banner for non-essential (advertising) cookies.
 * Required under UK PECR for Google AdSense.
 *
 * Dispatches a 'citysieve-consent-updated' window event on choice so that
 * AdSenseLoader can react without a page reload.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
      setShow(true);
    }
  }, []);

  const handleChoice = (accepted: boolean) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'declined');
    window.dispatchEvent(new Event('citysieve-consent-updated'));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          CitySieve uses advertising cookies (Google AdSense) to help keep the service free.
          See our{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleChoice(false)}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => handleChoice(true)}
          >
            Accept cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
