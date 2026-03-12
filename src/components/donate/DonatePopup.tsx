'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'citysieve_donate_declined';
const ANALYSIS_RUNNING_KEY = 'citysieve_analysis_running';

export function DonatePopup() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    
    const declined = sessionStorage.getItem(STORAGE_KEY);
    if (declined) return;

    const surveyCompleted = sessionStorage.getItem('citysieve_survey_completed');
    if (!surveyCompleted) return;

    const isOnResults = pathname === '/results';
    const isAnalysisRunning = isOnResults && sessionStorage.getItem(ANALYSIS_RUNNING_KEY) === 'true';

    if (isAnalysisRunning) return;

    const delay = 10000;

    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDecline = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  const handleAccept = () => {
    const username = process.env.NEXT_PUBLIC_BMAC_USERNAME;
    if (username) {
      window.open(`https://www.buymeacoffee.com/${username}`, '_blank');
    }
    setShow(false);
  };

  if (!mounted || !show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" x2="6" y1="2" y2="4" />
              <line x1="10" x2="10" y1="2" y2="4" />
              <line x1="14" x2="14" y1="2" y2="4" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Enjoying CitySieve?</h3>
            <p className="text-muted-foreground">
              If you found this helpful, consider buying us a coffee to help keep CitySieve free and running.
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleDecline}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Maybe later
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 rounded-lg border border-[#FFDD00] bg-[#FFDD00] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#FFDD00]/80"
            >
              Buy me a coffee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
