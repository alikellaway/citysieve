'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { SurveyProvider } from '@/lib/survey/context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <SurveyProvider>{children}</SurveyProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
