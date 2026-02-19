'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 cursor-pointer rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2"
                />
              ) : (
                <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-muted text-sm font-medium ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2">
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/my-surveys')}
            >
              Survey History
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/account')}
            >
              Account Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="hidden text-sm font-medium sm:inline">
          {session.user.name}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signIn('google')}
    >
      Sign in
    </Button>
  );
}
