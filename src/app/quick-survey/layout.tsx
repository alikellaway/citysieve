import { SiteHeader } from '@/components/layout/SiteHeader';

export default function QuickSurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <main>{children}</main>
      </div>
    </div>
  );
}
