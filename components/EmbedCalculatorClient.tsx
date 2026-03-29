"use client";

import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

import { Calculator } from "@/components/Calculator";
import { ResultsPanel } from "@/components/ResultsPanel";
import type { CalculatorFormData } from "@/lib/calculatorForm";
import { mapCalculatorFormToInput } from "@/lib/calculatorForm";
import {
  AUDIT_PRIORITY,
  calculateGrants,
  type CalculatorInput,
  type GrantCalculationResult,
} from "@/lib/grants";

export const EMBED_LEAD_MESSAGE_TYPE = "GREENCHECK_EMBED_LEAD" as const;

type Step = "form" | "results";

type Props = {
  installerId: string;
  primaryColor: string;
  companyName: string;
  logoUrl: string;
};

async function subscribeLead(
  form: CalculatorFormData,
  input: CalculatorInput,
  grant: GrantCalculationResult
): Promise<boolean> {
  try {
    const res = await fetch("/api/subscribe", {
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
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
    };
    return res.ok && body.success === true;
  } catch {
    return false;
  }
}

function postLeadToParent(installerId: string, lead: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage(
    {
      type: EMBED_LEAD_MESSAGE_TYPE,
      installerId,
      lead,
    },
    "*"
  );
}

export function EmbedCalculatorClient({
  installerId,
  primaryColor,
  companyName,
  logoUrl,
}: Props) {
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
    async (data: CalculatorFormData) => {
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

      const subscribed = await subscribeLead(data, input, grants);
      if (subscribed) {
        postLeadToParent(installerId, {
          firstName: data.firstName.trim(),
          email: data.email.trim().toLowerCase(),
          userType: data.role,
          wantsChecklist: data.sendChecklist,
          homeDetails: {
            ...input.homeDetails,
            province: input.homeDetails.province ?? "ON",
          },
          grantResults: {
            federal: grants.federal,
            ontario: grants.ontario,
            total: grants.total,
            eligiblePrograms: grants.eligiblePrograms,
          },
          timestamp: new Date().toISOString(),
        });
      }

      void runGenerateStream(input, grants);
    },
    [installerId, runGenerateStream]
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
      const ok = res.ok && body.success === true;
      setChecklistCaptured(ok);
      if (ok) {
        postLeadToParent(installerId, {
          firstName: formData.firstName.trim(),
          email: formData.email.trim().toLowerCase(),
          userType: formData.role,
          wantsChecklist: true,
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
          timestamp: new Date().toISOString(),
          source: "checklist",
        });
      }
    } finally {
      setChecklistSending(false);
    }
  }, [formData, grantResults, checklistCaptured, installerId]);

  const inputFromForm =
    formData !== null ? mapCalculatorFormToInput(formData) : null;
  const homeDetails = inputFromForm?.homeDetails ?? null;
  const auditPriority =
    homeDetails !== null ? AUDIT_PRIORITY(homeDetails) : null;

  const rootStyle = {
    "--embed-primary": primaryColor,
  } as CSSProperties;

  return (
    <main
      className="embed-calculator-root min-h-[min(700px,100vh)] bg-neutral-50 px-3 py-4 text-neutral-900 sm:px-4"
      style={rootStyle}
    >
      <div className="mx-auto w-full max-w-2xl">
        {step === "form" && (
          <Calculator
            key={calculatorKey}
            variant="embed"
            companyName={companyName}
            onSubmit={handleFormSubmit}
          />
        )}

        {step === "results" && (
          <div className="space-y-6">
            <ResultsPanel
              variant="embed"
              poweredByCompany={companyName}
              logoUrl={logoUrl || undefined}
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
      </div>
    </main>
  );
}
