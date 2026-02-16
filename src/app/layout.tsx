import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SurveyProvider } from "@/lib/survey/context";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CitySeive — Find Your Perfect Place to Live",
  description:
    "Take a quick survey about your priorities and discover the best areas to move to, powered by live data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <SurveyProvider>{children}</SurveyProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
