'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TERMS_VERSION } from '@/lib/terms-version';

const LS_KEY = 'citysieve-terms-v';

/**
 * Wraps survey entry points with a non-dismissible terms acceptance gate.
 *
 * Acceptance is stored in:
 * - localStorage (all users)  -  keyed by TERMS_VERSION
 * - Database (authenticated users)  -  via PATCH /api/account/terms
 *
 * When TERMS_VERSION is bumped, the mismatch triggers re-acceptance.
 */
export function TermsGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Initialise synchronously from localStorage to avoid a flash on return visits.
  const [accepted, setAccepted] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LS_KEY) === TERMS_VERSION ? true : null;
  });

  useEffect(() => {
    // Already accepted via localStorage  -  nothing more to do.
    if (accepted === true) return;

    // Wait until the session resolves before making a final decision.
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.termsVersion === TERMS_VERSION) {
      // Sync the DB acceptance into localStorage so future visits skip the gate.
      localStorage.setItem(LS_KEY, TERMS_VERSION);
      setAccepted(true);
      return;
    }

    // Anonymous user with no localStorage record, or authenticated user whose
    // termsVersion doesn't match  -  show the modal.
    setAccepted(false);
  }, [accepted, session, status]);

  const handleAccept = async () => {
    localStorage.setItem(LS_KEY, TERMS_VERSION);

    if (session?.user?.id) {
      // Best-effort  -  fire and forget. The DB record is a convenience; the
      // localStorage flag is the authoritative gate for the current session.
      fetch('/api/account/terms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: TERMS_VERSION }),
      }).catch(() => {
        // Non-fatal: the user has accepted locally; the DB will be updated
        // on their next session if this request fails.
      });
    }

    setAccepted(true);
  };

  // Still resolving  -  render nothing to avoid a flash of survey content.
  if (accepted === null) return null;

  // Accepted  -  render the survey normally.
  if (accepted) return <>{children}</>;

  // Show the non-dismissible acceptance modal.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-bold">Before you begin</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          CitySieve is free to use. Before starting the survey, please review and accept our{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          . Results are estimates based on OpenStreetMap data and are not professional property or
          legal advice.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You must be at least 13 years old to use this service.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={handleAccept}>
            Accept &amp; Continue
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => (window.location.href = '/')}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
