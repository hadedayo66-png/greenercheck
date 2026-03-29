import { NextResponse } from "next/server";
import { z } from "zod";

import { getInstallerEmbedConfig } from "@/lib/installerEmbedConfig";
import { fromNextParam } from "@/lib/resolveRouteParams";

const leadPayloadSchema = z.object({
  firstName: z.string().optional(),
  email: z.string().email().optional(),
  userType: z.string().optional(),
  wantsChecklist: z.boolean().optional(),
  homeDetails: z.record(z.string(), z.unknown()).optional(),
  grantResults: z
    .object({
      federal: z.number(),
      ontario: z.number(),
      total: z.number(),
      eligiblePrograms: z.array(z.string()),
    })
    .optional(),
  timestamp: z.string().optional(),
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Called from parent pages running `embed.js` after the iframe posts a lead.
 * Forwards JSON to the installer's webhook when configured (server-side only).
 */
export async function POST(
  req: Request,
  {
    params,
  }: {
    params: { installerId: string } | Promise<{ installerId: string }>;
  }
) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const { installerId } = await fromNextParam(params);

  if (process.env.NODE_ENV === "development") {
    console.log("[embed/webhook] POST received", { installerId });
  }

  const config = getInstallerEmbedConfig(installerId);
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "Unknown installer" },
      { status: 404, headers }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers }
    );
  }

  const parsed = leadPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400, headers }
    );
  }

  const payload = {
    installerId,
    source: "greenercheck-embed",
    receivedAt: new Date().toISOString(),
    lead: parsed.data,
  };

  if (!config.webhookUrl) {
    return NextResponse.json(
      { ok: true, forwarded: false, reason: "No webhook configured" },
      { headers }
    );
  }

  try {
    const whRes = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!whRes.ok) {
      const text = await whRes.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "Webhook returned non-OK status",
          status: whRes.status,
          body: text.slice(0, 500),
        },
        { status: 502, headers }
      );
    }
    return NextResponse.json({ ok: true, forwarded: true }, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Webhook request failed",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502, headers }
    );
  }
}
