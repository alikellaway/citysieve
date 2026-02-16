import { cn } from '@/lib/utils';

interface DonateButtonProps {
  className?: string;
}

export function DonateButton({ className }: DonateButtonProps) {
  const username = process.env.NEXT_PUBLIC_BMAC_USERNAME;

  if (!username) return null;

  return (
    <a
      href={`https://www.buymeacoffee.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-[#FFDD00] bg-[#FFDD00] px-4 py-2 text-sm font-semibold text-[#000000] shadow-sm transition-colors hover:bg-[#FFDD00]/80',
        className
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
      </svg>
      Buy me a coffee
    </a>
  );
}
