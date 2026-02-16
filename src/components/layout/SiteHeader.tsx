import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          CitySeive
        </Link>
        <AuthButton />
      </div>
    </header>
  );
}
