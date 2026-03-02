import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BackButton } from '@/components/ui/BackButton';

export const metadata: Metadata = {
  title: 'Terms of Service  -  CitySieve',
  description: 'Terms and conditions for using CitySieve.',
};

const LAST_UPDATED = '2 March 2026';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-base leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-bold">1. Acceptance of terms</h2>
            <p className="text-muted-foreground">
              By accessing or using CitySieve (&ldquo;the Service&rdquo;), you agree to be bound by
              these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, please do not use
              the Service. These Terms apply to all visitors and users, whether or not they create
              an account. Your continued use of the Service after any update to these Terms
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">2. Who we are</h2>
            <p className="text-muted-foreground">
              CitySieve is a free neighbourhood-matching tool operated by an individual developer
              based in the United Kingdom. For any queries, please use our{' '}
              <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
                Contact page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">3. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 13 years old to use CitySieve. If you are under 13, please do
              not use this Service. If you are between 13 and 18, we recommend reviewing these
              Terms with a parent or guardian before proceeding.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">4. Description of the Service</h2>
            <p className="text-muted-foreground">
              CitySieve helps you explore UK neighbourhoods by scoring areas against your lifestyle
              preferences using publicly available OpenStreetMap data. Results are provided for
              informational and exploratory purposes only. They are{' '}
              <strong className="font-semibold text-foreground">not</strong> professional property,
              financial, or legal advice and should not be relied upon as the sole basis for any
              housing or relocation decision. Always conduct your own research and seek independent
              professional advice before making significant decisions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">5. Data accuracy</h2>
            <p className="text-muted-foreground">
              The scoring data used by CitySieve is sourced from OpenStreetMap (OSM), a
              crowd-sourced geographic database maintained by volunteers. OSM data may be
              incomplete, outdated, or inaccurate. Scores are estimates based on the proximity and
              density of amenity types within a defined radius; they do not reflect property prices,
              school quality, crime rates, commute delays, planning developments, or any other
              factors not explicitly modelled in the survey. CitySieve makes no warranty that any
              result accurately reflects the real-world character or desirability of any area.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">6. User accounts</h2>
            <p className="text-muted-foreground">
              Creating an account is entirely optional  -  the Service works without one. If you
              choose to sign in with Google, you are responsible for the security of your Google
              account. CitySieve stores only your email address, display name, and profile picture
              for identification purposes. You can delete your account and all associated data at
              any time via{' '}
              <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
                Account Settings
              </Link>
              . See our{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">7. Acceptable use</h2>
            <p className="mb-3 text-muted-foreground">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Use automated means  -  including bots, scrapers, or crawlers  -  to access the Service
                or its underlying APIs without prior written permission.
              </li>
              <li>
                Attempt to interfere with, disable, or disrupt the Service or its infrastructure.
              </li>
              <li>
                Attempt to gain unauthorised access to any system, account, or data associated with
                the Service.
              </li>
              <li>Use the Service for any unlawful purpose or in breach of any applicable law.</li>
              <li>
                Transmit any material that is harmful, offensive, or infringes the rights of
                others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">8. Third-party services</h2>
            <p className="text-muted-foreground">
              The Service relies on third-party providers including OpenStreetMap / Overpass API,
              Nominatim geocoding, Google OAuth 2.0, Google AdSense, CartoDB map tiles,
              Postcodes.io, and affiliate property links to Rightmove and Zoopla. CitySieve is not
              responsible for the availability, accuracy, content, or privacy practices of these
              third parties. Your use of any third-party service is subject to that service&apos;s
              own terms and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">9. Intellectual property</h2>
            <p className="text-muted-foreground">
              The CitySieve name, logo, and original code are the property of the operator. All
              rights reserved. Neighbourhood and amenity data is sourced from OpenStreetMap
              contributors and is licensed under the{' '}
              <a
                href="https://opendatacommons.org/licenses/odbl/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Open Database Licence (ODbL)
              </a>
              . You may not reproduce or distribute CitySieve&apos;s original creative works or
              branding without written permission.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">10. Limitation of liability</h2>
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, CitySieve and its operator shall not be
              liable for any indirect, incidental, special, or consequential damages arising from
              your use of  -  or inability to use  -  the Service. This includes, without limitation,
              any loss suffered as a result of a housing or relocation decision made in reliance on
              CitySieve results. The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranty of any kind, express or implied.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">11. Governing law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by and construed in accordance with the laws of England and
              Wales. Any dispute arising out of or in connection with these Terms shall be subject
              to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">12. Changes to these Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. When we do, the &ldquo;last
              updated&rdquo; date at the top of this page will change, and you will be prompted to
              re-accept within the Service if the changes are material. Continued use of the Service
              after re-accepting updated Terms constitutes agreement to those changes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">13. Contact</h2>
            <p className="text-muted-foreground">
              For any queries about these Terms, please use our{' '}
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
