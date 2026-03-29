import { createAnthropic } from "@ai-sdk/anthropic";
import { createTextStreamResponse, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireEnv } from "@/lib/env";
import { GRANT_DATA, UPGRADE_IDS, type UpgradeId } from "@/lib/grants";

const MODEL = "claude-3-5-sonnet-20241022";

/** Plain `text/plain` streaming response (legacy AI SDK name: `StreamingTextResponse`). */
const StreamingTextResponse = createTextStreamResponse;

const SYSTEM_PROMPT =
  "You are a friendly Canadian energy retrofit advisor specialising in Ontario's Greener Homes Grant program and NRCan EnerGuide audits. You help homeowners in Ontario — especially in areas like Barrie, Simcoe County, and the GTA — understand their retrofit options clearly and practically. Always be specific, helpful, and honest about what an EnerGuide audit involves.";

function isUpgradeId(v: string): v is UpgradeId {
  return (UPGRADE_IDS as readonly string[]).includes(v);
}

const homeDetailsSchema = z.object({
  homeType: z.string().min(1),
  yearBuilt: z.coerce.number().min(1800).max(2100),
  heatingType: z.string().min(1),
  sqftRange: z.string().min(1),
  province: z.string().optional(),
});

const grantResultsSchema = z.object({
  federal: z.number().min(0),
  ontario: z.number().min(0),
  total: z.number().min(0),
  auditPriority: z.enum(["high", "medium", "low"]),
  eligiblePrograms: z.array(z.string()).optional(),
});

const bodySchema = z.object({
  homeDetails: homeDetailsSchema,
  selectedUpgrades: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every(isUpgradeId), {
      message: "Invalid upgrade id in selectedUpgrades",
    }),
  grantResults: grantResultsSchema,
});

function formatUpgradeLabels(ids: UpgradeId[]): string {
  return ids.map((id) => GRANT_DATA[id]?.label ?? id).join(", ");
}

function formatDisplayHeating(heatingType: string): string {
  return heatingType.replace(/_/g, " ");
}

function formatDisplayHomeType(homeType: string): string {
  return homeType.replace(/_/g, " ");
}

function formatSqftRange(sqftRange: string): string {
  return sqftRange.replace(/_/g, " ");
}

function buildUserPrompt(params: {
  homeType: string;
  yearBuilt: number;
  heatingType: string;
  sqftRange: string;
  upgradesLabel: string;
  total: number;
  auditPriority: string;
}): string {
  const totalFormatted = params.total.toLocaleString("en-CA");
  return `A homeowner has filled in the following details:
- Home type: ${params.homeType}
- Year built: ${params.yearBuilt}
- Current heating: ${params.heatingType}
- Size: ${params.sqftRange}
- Upgrades considering: ${params.upgradesLabel}
- Estimated total grants: CAD $${totalFormatted}
- Audit priority: ${params.auditPriority}

Write a 3-paragraph personalised summary (max 180 words total):
Paragraph 1: Their grant eligibility headline — what they can claim and why their home profile is a good/moderate/limited candidate.
Paragraph 2: What the EnerGuide audit process involves for them specifically, and what to prepare.
Paragraph 3: Their recommended first action step (book auditor / start with insulation / etc).

Be warm, specific to Ontario, and avoid jargon. Do not use bullet points.`;
}

const FALLBACK_SUMMARY = `Based on your home profile in Ontario, you may be eligible for federal and provincial retrofit incentives that together can reach the estimated total we showed—especially if you move ahead with an EnerGuide pre-retrofit audit through a registered service organisation.

An EnerGuide audit is a structured home visit: an energy advisor tests how your home uses energy, identifies upgrade opportunities, and leaves you with a clear report and renovation roadmap. In the GTA, Barrie, and Simcoe County, booking early helps because auditors' schedules can fill up before rebate intake windows.

Your best next step is to contact a licensed EnerGuide advisor serving your area and lock in a pre-retrofit audit date. If you prefer to stage work, many homeowners start with air sealing and insulation improvements, then plan heat pumps or other major upgrades with the audit report in hand.

We could not reach our writing service just now, so this is a static summary—try again in a moment for a fully personalised version.`;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  console.log("Generate request from:", ip);
  // TODO: add upstash/ratelimit here before high traffic

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { homeDetails, selectedUpgrades, grantResults } = parsed.data;
  const upgrades = selectedUpgrades as UpgradeId[];

  const userPrompt = buildUserPrompt({
    homeType: formatDisplayHomeType(homeDetails.homeType),
    yearBuilt: homeDetails.yearBuilt,
    heatingType: formatDisplayHeating(homeDetails.heatingType),
    sqftRange: formatSqftRange(homeDetails.sqftRange),
    upgradesLabel: formatUpgradeLabels(upgrades),
    total: grantResults.total,
    auditPriority: grantResults.auditPriority,
  });

  let apiKey: string;
  try {
    apiKey = requireEnv("ANTHROPIC_API_KEY");
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Missing server configuration",
      },
      { status: 500 }
    );
  }

  const anthropic = createAnthropic({ apiKey });

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 1024,
  });

  const textStream = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch {
        controller.enqueue(FALLBACK_SUMMARY);
        controller.close();
      }
    },
  });

  return StreamingTextResponse({
    textStream,
    headers: { "Cache-Control": "no-store" },
  });
}
