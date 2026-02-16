'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSurvey } from '@/hooks/useSurvey';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SavedSurveyMeta {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export default function MySurveysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loadState } = useSurvey();
  const [surveys, setSurveys] = useState<SavedSurveyMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/survey/list')
        .then((r) => r.json())
        .then(setSurveys)
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  async function handleLoad(id: string) {
    const res = await fetch(`/api/survey/${id}`);
    const data = await res.json();
    loadState(data.state);
    router.push('/results');
  }

  async function handleDelete(id: string) {
    await fetch(`/api/survey/${id}`, { method: 'DELETE' });
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h2 className="mb-6 text-lg font-semibold">My Saved Surveys</h2>

        {status === 'loading' || loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No saved surveys yet.</p>
              <Button className="mt-4" onClick={() => router.push('/survey/profile')}>
                Start a Survey
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{survey.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {new Date(survey.updatedAt).toLocaleDateString()}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleLoad(survey.id)}>
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(survey.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
