import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { saveInstallerInquiry } from "@/lib/storage";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().min(1).max(200),
  email: z.string().email(),
  website: z.string().min(1).max(500),
});

function normalizeWebsite(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export async function POST(req: Request) {
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

  const website = normalizeWebsite(parsed.data.website);
  let websiteValid = false;
  try {
    websiteValid = Boolean(new URL(website).href);
  } catch {
    websiteValid = false;
  }
  if (!websiteValid) {
    return NextResponse.json(
      { success: false, error: "Enter a valid website URL" },
      { status: 400 }
    );
  }

  const row = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    name: parsed.data.name.trim(),
    company: parsed.data.company.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    website,
  };

  try {
    await saveInstallerInquiry(row);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not save inquiry",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "hello@yourdomain.ca";
  const notifyEmail = process.env.NOTIFY_EMAIL?.trim();

  if (!apiKey || !notifyEmail) {
    return NextResponse.json({
      success: true,
      warning: "Inquiry saved; email notifications not configured",
    });
  }

  const resend = new Resend(apiKey);
  const text = [
    `Installer inquiry ${row.id} @ ${row.timestamp}`,
    "",
    `name: ${row.name}`,
    `company: ${row.company}`,
    `email: ${row.email}`,
    `website: ${row.website}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: `GreenerCheck <${fromEmail}>`,
    to: notifyEmail,
    subject: `Installer inquiry: ${row.company} (${row.name})`,
    text,
  });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Inquiry saved but notification email failed",
        details: error.message,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
