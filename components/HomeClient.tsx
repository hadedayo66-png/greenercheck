"use client";

import { useCallback, useState } from "react";

import { Calculator } from "@/components/Calculator";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import type { CalculatorFormData } from "@/lib/calculatorForm";
import { mapCalculatorFormToInput } from "@/lib/calculatorForm";
import {
  AUDIT_PRIORITY,
  calculateGrants,
  type CalculatorInput,
  type GrantCalculationResult,
} from "@/lib/grants";

type Step = "form" | "results";

function fireSubscribe(
  form: CalculatorFormData,
  input: CalculatorInput,
  grant: GrantCalculationResult
) {
  void fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: form.firstName.trim(),
      email: form.email.trim(),
      userType: form.role,
      homeDetails: {
        ...input.homeDetails,
        province: input.homeDetails.province ?? "ON",
      },
      grantResults: {
        federal: grant.federal,
        ontario: grant.ontario,
        total: grant.total,
        eligiblePrograms: grant.eligiblePrograms,
      },
      wantsChecklist: form.sendChecklist,
    }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

export function HomeClient() {
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<CalculatorFormData | null>(null);
  const [grantResults, setGrantResults] = useState<GrantCalculationResult | null>(
    null
  );
  const [summary, setSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryStreamKey, setSummaryStreamKey] = useState(0);
  const [checklistCaptured, setChecklistCaptured] = useState(false);
  const [checklistSending, setChecklistSending] = useState(false);
  const [calculatorKey, setCalculatorKey] = useState(0);

  const runGenerateStream = useCallback(
    async (input: CalculatorInput, grant: GrantCalculationResult) => {
      setSummaryError(null);
      setIsLoadingSummary(true);
      setSummary("");
      setSummaryStreamKey((k) => k + 1);

      const payload = {
        homeDetails: {
          ...input.homeDetails,
          province: input.homeDetails.province ?? "ON",
        },
        selectedUpgrades: input.selectedUpgrades,
        grantResults: {
          federal: grant.federal,
          ontario: grant.ontario,
          total: grant.total,
          auditPriority: AUDIT_PRIORITY(input.homeDetails),
          eligiblePrograms: grant.eligiblePrograms,
        },
      };

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          if (contentType.includes("application/json")) {
            const body = (await res.json()) as { error?: string };
            throw new Error(
              typeof body.error === "string" ? body.error : "Request failed"
            );
          }
          throw new Error("Request failed");
        }

        if (!res.body || !contentType.includes("text/plain")) {
          throw new Error("Unexpected response from server");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (value) {
            accumulated += decoder.decode(value, { stream: true });
            setSummary(accumulated);
          }
          if (done) {
            accumulated += decoder.decode();
            setSummary(accumulated);
            break;
          }
        }
      } catch (e) {
        setSummaryError(
          e instanceof Error ? e.message : "Failed to generate summary"
        );
        setSummary("");
      } finally {
        setIsLoadingSummary(false);
      }
    },
    []
  );

  const handleFormSubmit = useCallback(
    (data: CalculatorFormData) => {
      const input = mapCalculatorFormToInput(data);
      const grants = calculateGrants(
        input.selectedUpgrades,
        input.homeDetails
      );

      setFormData(data);
      setGrantResults(grants);
      setStep("results");
      setSummary("");
      setSummaryError(null);
      setChecklistCaptured(data.sendChecklist);
      setChecklistSending(false);

      fireSubscribe(data, input, grants);
      void runGenerateStream(input, grants);
    },
    [runGenerateStream]
  );

  const handleStartOver = useCallback(() => {
    setStep("form");
    setFormData(null);
    setGrantResults(null);
    setSummary("");
    setSummaryError(null);
    setIsLoadingSummary(false);
    setSummaryStreamKey(0);
    setChecklistCaptured(false);
    setChecklistSending(false);
    setCalculatorKey((k) => k + 1);
  }, []);

  const handleDownloadChecklist = useCallback(async () => {
    if (!formData || !grantResults || checklistCaptured) return;
    const input = mapCalculatorFormToInput(formData);
    setChecklistSending(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          email: formData.email.trim(),
          userType: formData.role,
          homeDetails: {
            ...input.homeDetails,
            province: input.homeDetails.province ?? "ON",
          },
          grantResults: {
            federal: grantResults.federal,
            ontario: grantResults.ontario,
            total: grantResults.total,
            eligiblePrograms: grantResults.eligiblePrograms,
          },
          wantsChecklist: true,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
      };
      setChecklistCaptured(res.ok && body.success === true);
    } finally {
      setChecklistSending(false);
    }
  }, [formData, grantResults, checklistCaptured]);

  const inputFromForm =
    formData !== null ? mapCalculatorFormToInput(formData) : null;
  const homeDetails = inputFromForm?.homeDetails ?? null;
  const auditPriority =
    homeDetails !== null ? AUDIT_PRIORITY(homeDetails) : null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <SiteNav variant="home" />

      <section className="border-b border-emerald-100/60 bg-white">
        <div className="mx-auto max-w-2xl px-5 py-12 text-center md:px-6 md:py-16">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            Ontario retrofit grants
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-4xl">
            Find out exactly what{" "}
            <span className="text-emerald-700">Ontario grants</span> you qualify
            for
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600 md:text-lg">
            Free 60-second calculator · Based on NRCan Greener Homes + Enbridge
            HER+ · No login required
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-5 py-10 md:px-6 md:py-12">
        {step === "form" && (
          <Calculator key={calculatorKey} onSubmit={handleFormSubmit} />
        )}

        {step === "results" && (
          <div className="space-y-6">
            <ResultsPanel
              grantResults={grantResults}
              homeDetails={homeDetails}
              auditPriority={auditPriority}
              isLoadingSummary={isLoadingSummary}
              summary={summary}
              summaryError={summaryError}
              summaryStreamKey={summaryStreamKey}
              onDownloadChecklist={handleDownloadChecklist}
              checklistCaptured={checklistCaptured}
              checklistSending={checklistSending}
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleStartOver}
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </section>

      <section
        className="border-t border-neutral-200 bg-white py-8"
        aria-label="Trust"
      >
        <div className="mx-auto max-w-3xl px-5 text-center text-sm text-neutral-600 md:px-6">
          <p className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-1 sm:gap-y-2">
            <span>Based on NRCan 2024 grant data</span>
            <span className="hidden text-neutral-300 sm:inline" aria-hidden>
              ·
            </span>
            <span>Used by homeowners across Ontario</span>
            <span className="hidden text-neutral-300 sm:inline" aria-hidden>
              ·
            </span>
            <span>No spam, unsubscribe anytime</span>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
