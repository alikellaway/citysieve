import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AdSenseLoader } from "@/components/consent/AdSenseLoader";
import "@/styles/globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://citysieve.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CitySieve - Find Your Perfect Place to Live",
  description:
    "Take a quick survey about your priorities and discover the best areas to move to, powered by live OpenStreetMap data.",
  openGraph: {
    title: "CitySieve - Find Your Perfect Place to Live",
    description:
      "Take a quick survey about your priorities and discover the best areas to move to, powered by live OpenStreetMap data.",
    url: "/",
    siteName: "CitySieve",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CitySieve  -  Find Your Perfect Place to Live",
      },
    ],
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "CitySieve - Find Your Perfect Place to Live",
    description:
      "Take a quick survey about your priorities and discover the best areas to move to, powered by live OpenStreetMap data.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <SiteFooter />
          {/* AdSense is loaded client-side only after cookie consent is granted */}
          <AdSenseLoader />
        </Providers>
      </body>
    </html>
  );
}
