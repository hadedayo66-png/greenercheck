import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { requireEnv } from "@/lib/env";
import { saveLead, type LeadRecord } from "@/lib/storage";

const NRCAN_AUDITOR_URL =
  "https://www.nrcan.gc.ca/energy/efficiency/homes/20548";

const homeDetailsSchema = z
  .object({
    homeType: z.string().optional(),
    yearBuilt: z.string().min(1).optional(),
    heatingType: z.string().optional(),
    sqftRange: z.string().optional(),
    province: z.string().optional(),
  })
  .passthrough();

const grantResultsSchema = z.object({
  federal: z.number().min(0),
  ontario: z.number().min(0),
  total: z.number().min(0),
  eligiblePrograms: z.array(z.string()),
});

const bodySchema = z.object({
  firstName: z.string().min(1).max(120),
  email: z.string().email(),
  userType: z.string().min(1).max(120),
  homeDetails: homeDetailsSchema.default({}),
  grantResults: grantResultsSchema,
  wantsChecklist: z.boolean(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function programLabel(raw: string): string {
  if (raw.includes("Canada Greener Homes")) return "Canada Greener Homes (federal)";
  if (raw.includes("Enbridge")) return "Enbridge Home Efficiency Rebate+";
  if (raw.includes("IESO")) return "IESO / clean energy incentives";
  if (raw.includes("EV charger")) return "Ontario EV charger rebate";
  return raw.replace(/\s*\([^)]*\)\s*/g, "").trim() || raw;
}

function topGrantChecklistLines(programs: string[]): [string, string, string] {
  const labels = programs.map(programLabel).filter(Boolean);
  const defaults: [string, string, string] = [
    "Book a registered EnerGuide pre-retrofit audit (required for most federal rebates).",
    "Review Canada Greener Homes–style federal caps and stack with Ontario utility programs.",
    "Gather recent utility bills and a list of planned upgrades before your audit visit.",
  ];
  if (labels.length === 0) return defaults;
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(
      labels[i]
        ? `Explore ${labels[i]} — confirm eligibility and intake steps with your advisor.`
        : defaults[i]!
    );
  }
  return [out[0]!, out[1]!, out[2]!];
}

function buildUserEstimateHtml(params: {
  firstName: string;
  total: number;
  checklist: [string, string, string];
  ownerName: string;
  notifyEmail: string | null;
}): string {
  const totalStr = params.total.toLocaleString("en-CA", {
    maximumFractionDigits: 0,
  });
  const safeName = escapeHtml(params.firstName);
  const [a, b, c] = params.checklist.map(escapeHtml);
  const safeOwner = escapeHtml(params.ownerName);
  const unsub =
    params.notifyEmail !== null
      ? `<a href="mailto:${encodeURIComponent(params.notifyEmail)}?subject=${encodeURIComponent("Unsubscribe")}" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>`
      : "Unsubscribe";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0;font-size:16px;line-height:1.5;color:#18181b;">Hi ${safeName},</p>
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.55;color:#52525b;">
                Here is a snapshot of your estimated Ontario retrofit incentives (illustrative — not a guarantee of eligibility).
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px 28px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;">Estimated total</p>
              <p style="margin:8px 0 0 0;font-size:40px;font-weight:700;line-height:1.1;color:#15803d;">CAD $${escapeHtml(totalStr)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#18181b;">Top grants to line up next</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.5;color:#3f3f46;">
                <tr><td style="padding:10px 0;border-top:1px solid #f4f4f5;">1. ${a}</td></tr>
                <tr><td style="padding:10px 0;border-top:1px solid #f4f4f5;">2. ${b}</td></tr>
                <tr><td style="padding:10px 0;border-top:1px solid #f4f4f5;">3. ${c}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;text-align:center;">
              <a href="${NRCAN_AUDITOR_URL}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;">Book your EnerGuide audit</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Built by ${safeOwner} · Barrie, ON · ${unsub}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildNotifyPlainText(lead: LeadRecord): string {
  return [
    `New lead ${lead.id} @ ${lead.timestamp}`,
    "",
    `firstName: ${lead.firstName}`,
    `email: ${lead.email}`,
    `userType: ${lead.userType}`,
    `wantsChecklist: ${lead.wantsChecklist}`,
    "",
    "homeDetails:",
    JSON.stringify(lead.homeDetails, null, 2),
    "",
    "grantResults:",
    JSON.stringify(lead.grantResults, null, 2),
  ].join("\n");
}

export async function POST(req: Request) {
  let apiKey: string;
  try {
    apiKey = requireEnv("RESEND_API_KEY");
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error ? e.message : "Missing server configuration",
      },
      { status: 500 }
    );
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "hello@yourdomain.ca";
  const notifyEmail = process.env.NOTIFY_EMAIL?.trim();
  const ownerName = process.env.SITE_OWNER_NAME?.trim() || "Your Name";

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const lead: LeadRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    firstName: data.firstName.trim(),
    email: data.email.trim().toLowerCase(),
    userType: data.userType.trim(),
    homeDetails: data.homeDetails as Record<string, unknown>,
    grantResults: data.grantResults,
    wantsChecklist: data.wantsChecklist,
  };

  try {
    await saveLead(lead);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not save lead",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);
  const checklist = topGrantChecklistLines(lead.grantResults.eligiblePrograms);
  const homeTypeDisplay =
    typeof lead.homeDetails.homeType === "string"
      ? lead.homeDetails.homeType
      : "Ontario";

  const userMail = await resend.emails.send({
    from: `Ontario Retrofit <${fromEmail}>`,
    to: lead.email,
    subject: `Your Ontario grant estimate is ready, ${lead.firstName}`,
    html: buildUserEstimateHtml({
      firstName: lead.firstName,
      total: lead.grantResults.total,
      checklist,
      ownerName,
      notifyEmail: notifyEmail || null,
    }),
  });

  if (userMail.error) {
    return NextResponse.json(
      {
        success: false,
        error: "Lead saved but the estimate email could not be sent",
        details: userMail.error.message,
      },
      { status: 502 }
    );
  }

  if (notifyEmail) {
    const adminMail = await resend.emails.send({
      from: `Ontario Retrofit <${fromEmail}>`,
      to: notifyEmail,
      subject: `New lead: ${lead.firstName} from ${homeTypeDisplay} in Ontario`,
      text: buildNotifyPlainText(lead),
    });
    if (adminMail.error) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead saved and user emailed; team notification failed",
          details: adminMail.error.message,
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
