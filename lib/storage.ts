import { promises as fs } from "fs";
import path from "path";

export type LeadRecord = {
  id: string;
  timestamp: string;
  firstName: string;
  email: string;
  userType: string;
  homeDetails: Record<string, unknown>;
  grantResults: {
    federal: number;
    ontario: number;
    total: number;
    eligiblePrograms: string[];
  };
  wantsChecklist: boolean;
};

export type InstallerInquiryRecord = {
  id: string;
  timestamp: string;
  name: string;
  company: string;
  email: string;
  website: string;
};

const LEADS_FILE = path.join(process.cwd(), "data", "leads.json");
const INSTALLER_LEADS_FILE = path.join(
  process.cwd(),
  "data",
  "installer-leads.json"
);

function isVercelProduction(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Persist a homeowner calculator lead. On Vercel, the filesystem is read-only;
 * leads are logged for now — email notifications remain the source of truth until
 * a database is wired in.
 */
export async function saveLead(lead: LeadRecord): Promise<void> {
  if (isVercelProduction()) {
    // TODO: Swap for Postgres / Supabase / Vercel KV / Neon — Vercel serverless has no writable disk.
    console.log(
      "[saveLead] Lead captured (persist to DB):",
      JSON.stringify(lead)
    );
    return;
  }

  const dir = path.dirname(LEADS_FILE);
  await fs.mkdir(dir, { recursive: true });

  let leads: LeadRecord[] = [];
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      leads = parsed as LeadRecord[];
    }
  } catch {
    /* missing or invalid */
  }

  leads.push(lead);
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

/** B2B installer inquiry — same persistence rules as {@link saveLead}. */
export async function saveInstallerInquiry(
  row: InstallerInquiryRecord
): Promise<void> {
  if (isVercelProduction()) {
    // TODO: Persist installer inquiries to your database (see saveLead).
    console.log(
      "[saveInstallerInquiry] Inquiry captured (persist to DB):",
      JSON.stringify(row)
    );
    return;
  }

  const dir = path.dirname(INSTALLER_LEADS_FILE);
  await fs.mkdir(dir, { recursive: true });

  let rows: InstallerInquiryRecord[] = [];
  try {
    const raw = await fs.readFile(INSTALLER_LEADS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      rows = parsed as InstallerInquiryRecord[];
    }
  } catch {
    /* missing or corrupt */
  }

  rows.push(row);
  await fs.writeFile(
    INSTALLER_LEADS_FILE,
    JSON.stringify(rows, null, 2),
    "utf-8"
  );
}
