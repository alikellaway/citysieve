'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { SurveyProvider } from '@/lib/survey/context';
import { CookieBanner } from '@/components/consent/CookieBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <SurveyProvider>
          {children}
          <CookieBanner />
        </SurveyProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
