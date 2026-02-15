"use client";

import { usePathname } from "next/navigation";
import { ProgressBar } from "@/components/survey/ProgressBar";
import { SURVEY_STEPS } from "@/lib/survey/steps";

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentStep =
    SURVEY_STEPS.find((s) => s.path === pathname)?.number ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-primary">CitySeive</h1>
      {currentStep > 0 && <ProgressBar currentStep={currentStep} />}
      <main className="mt-6">{children}</main>
    </div>
  );
}
