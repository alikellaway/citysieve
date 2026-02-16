import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AdSlot } from "@/components/ads/AdSlot";
import { DonateButton } from "@/components/donate/DonateButton";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Find your perfect
            <span className="block text-primary">place to live</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Choosing where to move is overwhelming. CitySeive takes your
            priorities — commute, amenities, lifestyle, budget — and
            recommends areas that actually match what matters to you, using
            live data.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/survey/profile"
              className="inline-flex h-12 items-center rounded-lg bg-primary px-8 text-lg font-semibold text-primary-foreground shadow hover:bg-primary/90"
            >
              Start the Survey
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-lg border border-input px-8 text-lg font-semibold hover:bg-accent"
            >
              How it works
            </a>
          </div>
        </div>

        <AdSlot size="leaderboard" className="mt-12" />

        <section id="how-it-works" className="mx-auto mt-12 max-w-4xl px-4 pb-16">
          <h3 className="mb-12 text-center text-2xl font-bold">
            How it works
          </h3>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                1
              </div>
              <h4 className="mb-2 font-semibold">Tell us your priorities</h4>
              <p className="text-sm text-muted-foreground">
                Answer questions about your commute, lifestyle, family needs,
                and environment preferences.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                2
              </div>
              <h4 className="mb-2 font-semibold">We crunch the data</h4>
              <p className="text-sm text-muted-foreground">
                Using live OpenStreetMap data, we score areas on amenities,
                transport links, and commute times.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                3
              </div>
              <h4 className="mb-2 font-semibold">Explore your matches</h4>
              <p className="text-sm text-muted-foreground">
                Browse ranked results on an interactive map and find the
                neighbourhood that fits you best.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4">
          <DonateButton />
          <p className="text-sm text-muted-foreground">
            CitySeive — Open source, powered by OpenStreetMap data
          </p>
        </div>
      </footer>
    </div>
  );
}
