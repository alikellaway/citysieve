import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ContactForm } from './ContactForm';
import { BackButton } from '@/components/ui/BackButton';

export const metadata: Metadata = {
  title: 'Contact — CitySieve',
  description: 'Get in touch with the CitySieve team — questions, feedback, bug reports, or anything else.',
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mb-10 text-lg text-muted-foreground">
          Found a bug? Have a suggestion? Just want to say the tool helped? We read every message.
        </p>
        <ContactForm />
      </main>
    </div>
  );
}
