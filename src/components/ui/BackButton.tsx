'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './button';

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="-ml-2 gap-1.5 pl-2"
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );
}
