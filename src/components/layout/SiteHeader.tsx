import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CitySieveLogo } from '@/components/CitySieveLogo';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          aria-label="CitySieve  -  go to homepage"
          className="transition-transform duration-200 hover:scale-[1.04]"
        >
          <CitySieveLogo variant="horizontal" iconSize={32} />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
