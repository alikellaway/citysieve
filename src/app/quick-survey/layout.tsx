'use client';

import { SiteHeader } from '@/components/layout/SiteHeader';
import { TermsGate } from '@/components/consent/TermsGate';

export default function QuickSurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TermsGate>
      <div>
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <main>{children}</main>
        </div>
      </div>
    </TermsGate>
  );
}
