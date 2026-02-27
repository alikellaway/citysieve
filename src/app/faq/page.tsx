import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackButton } from '@/components/ui/BackButton';

export const metadata: Metadata = {
  title: 'FAQ — CitySieve',
  description:
    'Frequently asked questions about CitySieve — how scoring works, what data we use, coverage, accuracy, and privacy.',
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What areas does CitySieve cover?',
    a: (
      <>
        CitySieve currently covers towns and cities across the{' '}
        <strong>United Kingdom</strong>. Results are most accurate in major cities (London,
        Manchester, Birmingham, Edinburgh, etc.) where OpenStreetMap coverage is most
        comprehensive. Coverage in rural areas may be less complete.
      </>
    ),
  },
  {
    q: 'How does the scoring work?',
    a: (
      <>
        CitySieve generates a grid of candidate areas within commuting distance of your key
        location (workplace, family address, etc.). Each candidate area is scored across several
        dimensions based on your survey answers:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Amenities</strong> — counts of pubs, restaurants, parks, gyms, supermarkets,
            cafés, and other points of interest within the area, weighted by how much you said
            they matter to you.
          </li>
          <li>
            <strong>Transport</strong> — proximity to train stations, tube stops, bus routes, and
            cycle paths.
          </li>
          <li>
            <strong>Commute</strong> — straight-line distance to your workplace or other key
            location (closer is better if commute matters to you).
          </li>
          <li>
            <strong>Environment</strong> — green space, quietness indicators, and air quality
            proxies from OSM data.
          </li>
          <li>
            <strong>Family</strong> — proximity to schools, playgrounds, and family-friendly
            amenities.
          </li>
        </ul>
        Each dimension is normalised across all candidates so areas are compared fairly. Your
        survey weights determine how much each dimension contributes to the final score.
      </>
    ),
  },
  {
    q: 'How accurate is the data?',
    a: (
      <>
        CitySieve uses live data from the{' '}
        <a
          href="https://www.openstreetmap.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Overpass API
        </a>{' '}
        (OpenStreetMap infrastructure), which is continuously updated by volunteers worldwide.
        In UK cities this is generally very thorough, but individual amenities may occasionally
        be missing, misclassified, or out of date.
        <p className="mt-2">
          Commute estimates are based on straight-line (as-the-crow-flies) distance, not actual
          journey time. Use the Google Maps links in each result card to verify real travel times.
        </p>
        <p className="mt-2 font-medium text-foreground">
          CitySieve results are a starting point for exploration, not a definitive ranking.
          Always visit an area before making decisions.
        </p>
      </>
    ),
  },
  {
    q: 'Do I need to create an account?',
    a: (
      <>
        No. You can take the full survey and view results without signing in. Creating a free
        account (via Google sign-in) lets you <strong>save surveys</strong> and return to them
        later from the <Link href="/my-surveys" className="underline underline-offset-2 hover:text-foreground">My Surveys</Link> page.
      </>
    ),
  },
  {
    q: 'Is my survey data private?',
    a: (
      <>
        Yes. Unsaved survey responses live only in your browser&apos;s local storage and are
        never sent to our servers. If you save a survey to your account, it is stored in our
        database and linked to your account — only you can see it. See our{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </Link>{' '}
        for full details.
      </>
    ),
  },
  {
    q: 'How do I delete my account and data?',
    a: (
      <>
        Go to{' '}
        <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
          Account Settings
        </Link>{' '}
        and use the &ldquo;Delete account&rdquo; option. This permanently removes your account,
        all saved surveys, and your email from our database.
      </>
    ),
  },
  {
    q: 'Why does CitySieve use OpenStreetMap?',
    a: (
      <>
        OpenStreetMap is a free, open dataset maintained by a global community of contributors.
        Unlike proprietary mapping services, OSM data can be queried freely and in bulk —
        which is essential for CitySieve&apos;s approach of scoring many candidate areas in one
        go. OSM is also frequently more detailed than commercial alternatives when it comes to
        local amenity data like pubs, parks, and independent shops.
      </>
    ),
  },
  {
    q: 'How often is the data updated?',
    a: (
      <>
        CitySieve queries the Overpass API live when you run a search, so the data is as
        current as OpenStreetMap itself (typically within hours of contributors making edits).
        Results are cached briefly in memory to avoid hitting rate limits on repeated identical
        searches.
      </>
    ),
  },
  {
    q: 'Can I save and compare different surveys?',
    a: (
      <>
        Yes — sign in with Google, run a survey, and click &ldquo;Save survey&rdquo; on the
        results page. You can create multiple surveys (e.g. one prioritising commute, one
        prioritising nightlife) and switch between them from the{' '}
        <Link href="/my-surveys" className="underline underline-offset-2 hover:text-foreground">
          My Surveys
        </Link>{' '}
        page.
      </>
    ),
  },
  {
    q: 'Why am I not seeing results for my area?',
    a: (
      <>
        A few possible reasons:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            The commute location you entered may not have been resolved to coordinates — try
            using a more specific address or postcode.
          </li>
          <li>
            Hard filters in your survey (e.g. a minimum number of a specific amenity) may be
            filtering out all candidates. Try the Full Survey to relax constraints.
          </li>
          <li>
            Very rural locations may not generate enough scored candidates to show results.
          </li>
        </ul>
        If you&apos;re still stuck,{' '}
        <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
          let us know
        </Link>{' '}
        — we may be able to help or fix a bug.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="mb-10 text-lg text-muted-foreground">
          Everything you need to know about how CitySieve works.{' '}
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Can&apos;t find your answer?
          </Link>
        </p>

        <dl className="divide-y">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-6">
              <dt className="mb-2 text-lg font-semibold">{q}</dt>
              <dd className="text-muted-foreground leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
