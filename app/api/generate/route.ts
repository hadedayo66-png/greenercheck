import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z } from "zod";

import { UPGRADE_IDS, type UpgradeId } from "@/lib/grants";

export const runtime = "edge";

function isUpgradeId(v: string): v is UpgradeId {
  return (UPGRADE_IDS as readonly string[]).includes(v);
}

const homeDetailsSchema = z.object({
  homeType: z.string().min(1),
  yearBuilt: z.string().min(1),
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

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing required environment variable: ANTHROPIC_API_KEY",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new Anthropic({ apiKey });

  const { homeDetails, selectedUpgrades, grantResults } = parsed.data;

  const userMessage = `A homeowner has the following profile:
- Home type: ${homeDetails.homeType}
- Year built: ${homeDetails.yearBuilt}
- Current heating: ${homeDetails.heatingType}
- Size: ${homeDetails.sqftRange} sq ft
- Upgrades considering: ${selectedUpgrades.join(", ")}
- Estimated federal grant: CAD $${grantResults.federal}
- Estimated Ontario rebate: CAD $${grantResults.ontario}
- Total potential: CAD $${grantResults.total}
- Audit priority: ${grantResults.auditPriority}

Write exactly 3 short paragraphs (60 words each max, 180 words total):
1. Their grant eligibility headline.
2. What the EnerGuide audit process involves for their specific home.
3. Their single most important first action step this week.
Be warm, Ontario-specific, no bullet points, no jargon.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system:
            "You are a friendly Canadian energy retrofit advisor specialising in Ontario Greener Homes grants. Be specific, warm and practical. Never use bullet points.",
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } catch (error) {
        controller.enqueue(
          new TextEncoder().encode(
            error instanceof Error
              ? error.message
              : "Failed to generate summary"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
