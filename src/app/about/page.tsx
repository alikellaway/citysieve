import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackButton } from '@/components/ui/BackButton';

export const metadata: Metadata = {
  title: 'About — CitySieve',
  description:
    'CitySieve is a free neighbourhood-matching tool that scores areas against your priorities using live OpenStreetMap data.',
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-8 text-4xl font-bold tracking-tight">About CitySieve</h1>

        <section className="mb-10 space-y-4 text-lg leading-relaxed text-muted-foreground">
          <p>
            CitySieve is a free tool that helps you figure out where to live. Most property
            search tools focus on listings. CitySieve focuses on{' '}
            <span className="font-medium text-foreground">you</span> — your commute, your
            lifestyle, the amenities that matter to your daily life.
          </p>
          <p>
            Tell us what you care about and we&apos;ll score every neighbourhood against those
            priorities, using live data from OpenStreetMap.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold">Why we built it</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Moving is one of the biggest decisions you&apos;ll make, and it&apos;s surprisingly
            hard to do well. Estate agents show you houses, not how long it takes to get a coffee
            or whether the park is walkable. CitySieve was built by a solo developer who wanted a
            more data-driven way to shortlist areas — and couldn&apos;t find one that worked well
            enough.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-6 text-2xl font-bold">How it works</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                1
              </span>
              <div>
                <p className="font-semibold">Take the survey</p>
                <p className="text-muted-foreground">
                  Answer questions about your commute, lifestyle priorities, budget range, family
                  needs, and local environment preferences.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                2
              </span>
              <div>
                <p className="font-semibold">We crunch the data</p>
                <p className="text-muted-foreground">
                  CitySieve generates candidate areas around your key locations, then scores each
                  one against live OpenStreetMap data — covering pubs, parks, supermarkets, gyms,
                  schools, transport links, and more.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                3
              </span>
              <div>
                <p className="font-semibold">Explore your results</p>
                <p className="text-muted-foreground">
                  Browse ranked areas on an interactive map, drill into amenity counts for each
                  neighbourhood, and get direct links to Rightmove, Zoopla, Google Maps, and
                  local school and crime data.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold">Data and accuracy</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            CitySieve uses{' '}
            <a
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              OpenStreetMap
            </a>{' '}
            data, contributed by volunteers worldwide and kept up to date continuously. Map data
            &copy; OpenStreetMap contributors, licensed under the{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Open Database Licence (ODbL)
            </a>
            .
          </p>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            Scores are indicative — they reflect the amenities captured in OpenStreetMap, which is
            very comprehensive in UK cities but may be incomplete in rural areas. Always verify
            what matters most to you before making any decisions.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 text-xl font-bold">Questions or feedback?</h2>
          <p className="text-muted-foreground">
            We read every message.{' '}
            <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
              Get in touch
            </Link>{' '}
            — whether it&apos;s a bug, a suggestion, or just to say the tool helped you find a
            great place to live.
          </p>
        </section>
      </main>
    </div>
  );
}
