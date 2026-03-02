'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { COOKIE_CONSENT_KEY } from '@/components/consent/CookieBanner';

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

/**
 * Conditionally loads the Google AdSense script only when the user has
 * accepted advertising cookies via the CookieBanner.
 *
 * Listens for 'citysieve-consent-updated' events so consent granted in the
 * same session loads AdSense without a page reload.
 */
export function AdSenseLoader() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      setConsented(localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted');
    };

    check();
    window.addEventListener('citysieve-consent-updated', check);
    return () => window.removeEventListener('citysieve-consent-updated', check);
  }, []);

  if (!PUB_ID || !consented) return null;

  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
