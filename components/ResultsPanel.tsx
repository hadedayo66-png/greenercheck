"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { AuditPriorityLevel, HomeDetails } from "@/lib/grants";

export type ResultsGrantSnapshot = {
  federal: number;
  ontario: number;
  total: number;
  eligiblePrograms: string[];
};

type Props = {
  grantResults: ResultsGrantSnapshot | null;
  homeDetails: HomeDetails | null;
  auditPriority: AuditPriorityLevel | null;
  isLoadingSummary: boolean;
  summary: string;
  onDownloadChecklist?: () => void | Promise<void>;
  checklistCaptured?: boolean;
  checklistSending?: boolean;
  summaryError?: string | null;
  /** Increment when a new summary stream starts (resets intro animation). */
  summaryStreamKey?: number;
  variant?: "default" | "embed";
  /** Shown above grant cards when set (embed white-label). */
  poweredByCompany?: string;
  logoUrl?: string;
};

function cad(n: number) {
  return `CAD $${n.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;
}

function formatHomeProfile(h: HomeDetails): string {
  const t = h.homeType.replace(/_/g, " ");
  const heat = h.heatingType.replace(/_/g, " ");
  const size = h.sqftRange.replace(/_/g, " ");
  return `${t} · Built ${h.yearBuilt} · ${heat} heating · ${size} sq ft`;
}

function programBadgeKind(
  name: string
): "federal" | "ontario" {
  const lower = name.toLowerCase();
  if (
    lower.includes("canada greener homes") ||
    lower.includes("(federal)") ||
    lower.includes("federal")
  ) {
    return "federal";
  }
  return "ontario";
}

function programDisplayName(name: string): string {
  if (name.includes("Canada Greener Homes")) return "Canada Greener Homes";
  if (name.includes("Enbridge")) return "Enbridge HER+";
  if (name.includes("IESO")) return "IESO Net Metering";
  if (name.includes("EV charger")) return "Ontario EV rebate";
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim() || name;
}

const AUDIT_BANNERS: Record<
  AuditPriorityLevel,
  { className: string; message: string }
> = {
  high: {
    className:
      "border-amber-200 bg-amber-50 text-amber-950 ring-1 ring-amber-200/80",
    message:
      "Your home is a high-priority retrofit candidate — auditors in Simcoe County book up fast",
  },
  medium: {
    className:
      "border-blue-200 bg-blue-50 text-blue-950 ring-1 ring-blue-200/80",
    message:
      "Good retrofit opportunity — an EnerGuide audit is your recommended next step",
  },
  low: {
    className:
      "border-neutral-200 bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/80",
    message:
      "Moderate eligibility — focus on the highest-ROI upgrades first",
  },
};

function TypingDotsTailwind() {
  return (
    <span className="inline-flex items-center gap-1.5 px-1" aria-hidden="true">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-duration:1s]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-duration:1s] [animation-delay:150ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-duration:1s] [animation-delay:300ms]" />
    </span>
  );
}

export function ResultsPanel({
  grantResults,
  homeDetails,
  auditPriority,
  isLoadingSummary,
  summary,
  onDownloadChecklist,
  checklistCaptured = false,
  checklistSending = false,
  summaryError = null,
  summaryStreamKey = 0,
  variant,
  poweredByCompany,
  logoUrl,
}: Props) {
  const resolvedVariant = variant ?? "default";
  const embed = resolvedVariant === "embed";
  const [summaryEntered, setSummaryEntered] = useState(false);
  const prevSummaryEmpty = useRef(true);

  useEffect(() => {
    setSummaryEntered(false);
    prevSummaryEmpty.current = true;
  }, [summaryStreamKey]);

  useEffect(() => {
    const empty = summary.length === 0;
    if (prevSummaryEmpty.current && !empty) {
      setSummaryEntered(true);
    }
    prevSummaryEmpty.current = empty;
  }, [summary]);

  if (!grantResults || !homeDetails || auditPriority === null) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600 shadow-sm">
        <p className="font-medium text-neutral-800">
          Your results will appear here
        </p>
        <p className="mt-2 max-w-sm mx-auto text-neutral-500">
          Complete the steps and submit the form to see federal and Ontario
          rebate estimates, programs, and your personalised readiness summary.
        </p>
      </div>
    );
  }

  const banner = AUDIT_BANNERS[auditPriority];
  const showTypingOnly =
    isLoadingSummary && summary.length === 0 && !summaryError;
  const showSummaryIdle =
    !isLoadingSummary && summary.length === 0 && !summaryError;

  const federalAmt = embed
    ? "mt-2 text-2xl font-semibold tabular-nums text-[color:var(--embed-primary\\2c #16a34a)]"
    : "mt-2 text-2xl font-semibold tabular-nums text-emerald-600";
  const totalCard = embed
    ? "rounded-lg border-2 border-[color:var(--embed-primary\\2c #16a34a)] bg-white p-5 shadow-md sm:col-span-1"
    : "rounded-lg border border-emerald-200/80 bg-white p-5 shadow-md ring-1 ring-emerald-100 sm:col-span-1";
  const totalLabel = embed
    ? "text-xs font-medium uppercase tracking-wide text-neutral-600"
    : "text-xs font-medium uppercase tracking-wide text-emerald-800/80";
  const totalAmt = embed
    ? "mt-2 text-3xl font-bold tabular-nums text-[color:var(--embed-primary\\2c #16a34a)]"
    : "mt-2 text-3xl font-bold tabular-nums text-emerald-700";
  const federalPill = embed
    ? "border border-[color:var(--embed-primary\\2c #16a34a)] bg-neutral-50 text-neutral-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100";
  const checklistBtnEmbed =
    "flex-1 rounded-lg border border-transparent px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-[0.92] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:opacity-100";
  const checklistBtn = embed
    ? checklistBtnEmbed
    : "flex-1 rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400";

  return (
    <div className="space-y-6">
      {embed && poweredByCompany?.trim() ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center shadow-sm sm:flex-row sm:text-left">
          {logoUrl ? (
            <div className="relative h-9 w-[140px] shrink-0">
              <Image
                src={logoUrl}
                alt={`${poweredByCompany.trim()} logo`}
                fill
                className="object-contain object-center"
                sizes="140px"
                unoptimized
              />
            </div>
          ) : null}
          <p className="text-sm text-neutral-600">
            Powered by{" "}
            <span className="font-semibold text-neutral-900">
              {poweredByCompany.trim()}
            </span>
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Federal grant
          </p>
          {grantResults.federal === 0 ? (
            <p className="mt-2 text-base font-normal text-gray-400">
              Not applicable
            </p>
          ) : (
            <p className={federalAmt}>{cad(grantResults.federal)}</p>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Ontario rebate
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-blue-600">
            {cad(grantResults.ontario)}
          </p>
        </div>
        <div className={totalCard}>
          <p className={totalLabel}>Total potential</p>
          <p className={totalAmt}>{cad(grantResults.total)}</p>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        {formatHomeProfile(homeDetails)}
      </p>

      {grantResults.eligiblePrograms.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Eligible programs
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {grantResults.eligiblePrograms.map((raw) => {
              const label = programDisplayName(raw);
              const kind = programBadgeKind(raw);
              const pill =
                kind === "federal"
                  ? federalPill
                  : "border-blue-200 bg-blue-50 text-blue-900 ring-1 ring-blue-100";
              return (
                <span
                  key={raw}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${pill}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`rounded-lg border px-4 py-3 text-sm font-medium leading-snug shadow-sm ${banner.className}`}
        role="status"
      >
        {banner.message}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <Sparkles
            className="h-4 w-4 shrink-0 text-violet-500"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-neutral-900">
            Your personalised readiness summary
          </h3>
        </div>

        <div className="min-h-[4.5rem] pt-5">
          {summaryError && (
            <p className="text-sm text-red-600" role="alert">
              {summaryError}
            </p>
          )}

          {showTypingOnly && (
            <div
              className="flex items-center gap-2 text-sm text-neutral-500"
              aria-live="polite"
            >
              <span>Preparing your summary</span>
              <TypingDotsTailwind />
            </div>
          )}

          {summary.length > 0 && (
            <div
              className={`text-sm leading-relaxed text-neutral-700 ${
                summaryEntered ? "animate-fade-in-up" : ""
              }`}
            >
              <p className="whitespace-pre-wrap">
                {summary}
                {isLoadingSummary && (
                  <span
                    className="ml-0.5 inline-block h-4 w-px animate-pulse bg-violet-400 align-middle"
                    aria-hidden
                  />
                )}
              </p>
            </div>
          )}

          {showSummaryIdle && (
            <p className="text-sm text-neutral-400">
              Summary will appear once processing begins.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          disabled={
            checklistSending || checklistCaptured || !onDownloadChecklist
          }
          onClick={() => void onDownloadChecklist?.()}
          style={
            embed
              ? { backgroundColor: "var(--embed-primary, #16a34a)" }
              : undefined
          }
          className={checklistBtn}
        >
          {checklistSending
            ? "Sending…"
            : checklistCaptured
              ? "Checklist sent"
              : "Download full checklist"}
        </button>
        <a
          href="https://www.nrcan.gc.ca/energy/efficiency/homes/20548"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          Find an auditor near me
          <ExternalLink className="h-4 w-4 text-neutral-500" aria-hidden />
        </a>
      </div>
    </div>
  );
}
