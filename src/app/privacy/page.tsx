import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackButton } from '@/components/ui/BackButton';

export const metadata: Metadata = {
  title: 'Privacy Policy — CitySieve',
  description: 'How CitySieve collects, uses, and protects your personal data.',
};

const LAST_UPDATED = '27 February 2026';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-base leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-bold">1. Who we are</h2>
            <p className="text-muted-foreground">
              CitySieve is a free neighbourhood-matching tool operated by an individual developer
              based in the United Kingdom. You can reach us via our{' '}
              <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
                Contact page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">2. What data we collect and why</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Account data (optional)</p>
                <p>
                  If you choose to sign in with Google, we receive and store your email address,
                  display name, and profile image URL from your Google account. This is used
                  solely to identify your account and link your saved surveys to it. You are
                  never required to sign in — the tool works fully without an account.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Survey responses (optional)</p>
                <p>
                  When you explicitly save a survey using the &ldquo;Save survey&rdquo; button,
                  your survey preferences (commute location, lifestyle ratings, budget range, and
                  similar) are stored in our database linked to your account. Surveys you do not
                  save are held only in your browser&apos;s local storage and never sent to our
                  servers.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Session data</p>
                <p>
                  When signed in, NextAuth sets a session cookie in your browser (HttpOnly,
                  Secure) to keep you logged in. This cookie contains a session token, not your
                  personal data directly. Session records are stored in our database and expire
                  automatically.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Location searches</p>
                <p>
                  When you type a location into CitySieve, the search query is sent to the
                  Nominatim geocoding service (operated by OpenStreetMap) to retrieve coordinates.
                  We do not log or store these queries on our servers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">3. Legal basis for processing</h2>
            <p className="text-muted-foreground">
              Under UK GDPR, we process your personal data on the following bases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Contractual necessity</span> — to
                provide the account and survey-saving features you have requested.
              </li>
              <li>
                <span className="font-medium text-foreground">Legitimate interests</span> — to
                operate, maintain, and improve the service.
              </li>
              <li>
                <span className="font-medium text-foreground">Consent</span> — for advertising
                cookies set by Google AdSense (see Section 5 below).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">4. Third-party processors</h2>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Google</p>
                <p>
                  We use Google OAuth 2.0 for sign-in. Google may process your data in accordance
                  with{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Google&apos;s Privacy Policy
                  </a>
                  . We also display Google AdSense advertisements; AdSense may set advertising
                  cookies on your device (see Section 5).
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">OpenStreetMap / Overpass API</p>
                <p>
                  Amenity data is fetched from the Overpass API (OpenStreetMap infrastructure).
                  Candidate coordinates are sent as part of bounding-box queries; no personal
                  data is included. Map tiles are served by CartoDB.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Postcodes.io</p>
                <p>
                  UK postcode lookups are used to label result areas. No personal data is
                  transmitted.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">5. Cookies</h2>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Necessary cookies</p>
                <p>
                  A session cookie is set when you sign in. This is strictly necessary for the
                  sign-in feature and does not require consent.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Advertising cookies (Google AdSense)</p>
                <p>
                  CitySieve displays advertisements served by Google AdSense. Google may use
                  cookies to show you personalised ads based on your browsing history. You can
                  opt out of personalised advertising via{' '}
                  <a
                    href="https://adssettings.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Google&apos;s Ad Settings
                  </a>{' '}
                  or by visiting{' '}
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    aboutads.info
                  </a>
                  .
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Local storage</p>
                <p>
                  Your survey responses are saved in your browser&apos;s local storage so you
                  can pick up where you left off. This data never leaves your device unless you
                  explicitly choose to save a survey to your account.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">6. Data retention</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Account data and saved surveys</span>{' '}
                — retained until you delete your account via{' '}
                <Link
                  href="/account"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Account Settings
                </Link>
                .
              </li>
              <li>
                <span className="font-medium text-foreground">Session records</span> — expire
                automatically (typically 30 days of inactivity).
              </li>
              <li>
                <span className="font-medium text-foreground">Browser local storage</span> — held
                in your browser indefinitely unless you clear it or delete your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">7. Your rights (UK GDPR)</h2>
            <p className="text-muted-foreground">
              As a UK resident you have the right to access, correct, export, or delete your
              personal data. You can delete all stored data by deleting your account in{' '}
              <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
                Account Settings
              </Link>
              . For any other requests or questions, please use our{' '}
              <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
                Contact page
              </Link>
              . You also have the right to lodge a complaint with the{' '}
              <a
                href="https://ico.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Information Commissioner&apos;s Office (ICO)
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">8. Changes to this policy</h2>
            <p className="text-muted-foreground">
              We may update this policy from time to time. Material changes will be noted at the
              top of this page with a revised &ldquo;last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">9. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related queries, please use our{' '}
              <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
                Contact page
              </Link>
              .
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
