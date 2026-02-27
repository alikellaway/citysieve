import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          CitySieve
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/faq" className="text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
