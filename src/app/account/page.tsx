'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/account')
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.emailOptIn === 'boolean') {
            setEmailOptIn(data.emailOptIn);
          }
        })
        .finally(() => setLoadingPrefs(false));
    }
  }, [status]);

  async function handleEmailOptInChange(value: boolean) {
    setEmailOptIn(value);
    setSavingPrefs(true);
    try {
      await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOptIn: value }),
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      }
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div>
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h2 className="text-lg font-semibold">Account Settings</h2>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-14 w-14 rounded-full"
              />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              <p className="text-xs text-muted-foreground">Managed by Google</p>
            </div>
          </CardContent>
        </Card>

        {/* Email preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="text-sm">
                Receive occasional tips and updates from CitySieve
              </span>
              <button
                role="switch"
                aria-checked={emailOptIn}
                disabled={loadingPrefs || savingPrefs}
                onClick={() => handleEmailOptInChange(!emailOptIn)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  emailOptIn ? 'bg-primary' : 'bg-input',
                ].join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
                    emailOptIn ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </label>
          </CardContent>
        </Card>

        {/* Delete account */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and all saved surveys.
            </p>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                  <DialogDescription>
                    This will permanently delete your account and all saved surveys.
                    This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
