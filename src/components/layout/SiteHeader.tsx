import Link from 'next/link';
import Image from 'next/image';
import { AuthButton } from '@/components/auth/AuthButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Image src="/icon-512.png" alt="CitySieve Logo" width={32} height={32} className="h-8 w-auto dark:hidden" priority />
          CitySieve
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
