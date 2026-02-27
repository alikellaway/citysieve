import Link from 'next/link';
import { DonateButton } from '@/components/donate/DonateButton';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 text-sm">
        <DonateButton />

        <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-muted-foreground">
          <Link href="/about" className="transition-colors hover:text-foreground">About</Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">FAQ</Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
        </nav>

        <p className="text-center text-muted-foreground">
          &copy; {year} CitySieve &mdash; powered by{' '}
          <a
            href="https://www.openstreetmap.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            OpenStreetMap
          </a>{' '}
          data &copy; OpenStreetMap contributors,{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            ODbL
          </a>
        </p>
      </div>
    </footer>
  );
}
