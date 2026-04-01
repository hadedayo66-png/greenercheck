import type { CalculatorInput, HomeDetails, UpgradeId } from "@/lib/grants";
import {
  AUDIT_PRIORITY,
  calculateGrants,
  estimateEligibleAmounts,
  GRANT_DATA,
} from "@/lib/grants";

/** Extra Claude context for specific upgrade lines (beyond GRANT_DATA label). */
const UPGRADE_PROMPT_DESCRIPTIONS: Partial<Record<UpgradeId, string>> = {
  ev_charger_home:
    "home Level 2 EV charger installation (eligible under Canada Greener Homes grant and the new federal EVAP program launching April 2026)",
};

export function buildAuditPrompt(input: CalculatorInput) {
  const rows = estimateEligibleAmounts(input);
  const calc = calculateGrants(input.selectedUpgrades, input.homeDetails);
  const priority = AUDIT_PRIORITY(input.homeDetails);

  const table = rows
    .map(
      (r) =>
        `- ${r.name}: urgency/fit ${r.fitScore}%, estimated ~$${r.estimatedAward.toLocaleString("en-CA")}`
    )
    .join("\n");

  const upgrades = input.selectedUpgrades
    .map((id) => {
      const row = GRANT_DATA[id];
      if (!row) return `- ${id}`;
      const desc = UPGRADE_PROMPT_DESCRIPTIONS[id];
      const amounts = `federal $${row.federal.toLocaleString("en-CA")}, Ontario streams as per calculator`;
      return desc
        ? `- ${row.label}: ${desc}; ${amounts}`
        : `- ${row.label} (${amounts})`;
    })
    .join("\n");

  const { homeDetails: h } = input;

  return `You are a concise home retrofit incentive assistant for Canadian / Ontario homeowners. The user selected upgrades and a deterministic calculator applied federal caps and Ontario rebate lines (illustrative amounts — not personalized eligibility).

Home:
- Type: ${h.homeType}
- Year built: ${h.yearBuilt}
- Primary heating: ${h.heatingType}
- Finished area band: ${h.sqftRange}
- Province: ${h.province ?? "ON"}

Retrofit audit priority (older + fossil heat = higher): ${priority}

Selected upgrades:
${upgrades}

Calculator summary:
- Federal (after household cap): $${calc.federal.toLocaleString("en-CA")}
- Ontario (stacked where applicable): $${calc.ontario.toLocaleString("en-CA")}
- Total estimate: $${calc.total.toLocaleString("en-CA")}
- Eligible program labels: ${calc.eligiblePrograms.join(", ") || "none"}

Line items:
${table}

Write a short audit summary (3-5 bullet points): strengths, gaps, and one actionable next step (e.g. energy audit, Enbridge registration). Do not invent real program deadlines or eligibility guarantees. Note amounts are estimates only.`;
}

/**
 * Claude prompt for a personalised pre-audit checklist (EnerGuide / Ontario context).
 */
export function generateChecklistPrompt(homeDetails: HomeDetails): string {
  const province = homeDetails.province ?? "ON";

  return `You are a Canadian energy advisor helping an Ontario homeowner prepare for a registered EnerGuide pre-retrofit audit (NRCan) and related provincial or utility rebates (e.g. Canada Greener Homes–style federal support, Enbridge HER+, IESO programs where applicable).

Home profile:
- Type: ${homeDetails.homeType}
- Year built: ${homeDetails.yearBuilt}
- Primary heating: ${homeDetails.heatingType}
- Approx. finished floor area band: ${homeDetails.sqftRange}
- Province: ${province}

Produce a **personalised pre-audit checklist** the homeowner can complete before the advisor arrives. Requirements:
- Use **numbered steps** (8–12 items), each one concrete (documents to gather, photos to take, access areas to clear, HVAC / electrical info to note).
- Tailor items to their **home type, age, and heating system** (e.g. oil/gas vs heat pump vs electric).
- Include Ontario-specific reminders where relevant (utility account numbers, recent bills, rental vs owned considerations if inferable from home type only).
- Mention **safety** (e.g. asbestos awareness for older homes) without diagnosing; keep tone practical and calm.
- End with a single line on **what happens after** the audit (report, renovation upgrade plan, rebate intake).
- Do **not** invent exact dollar amounts, program deadlines, or guarantee eligibility. Avoid bullet characters; use numbers only for the list.

Write in clear, plain language suitable for email or PDF export.`;
}
