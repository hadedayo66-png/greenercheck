/** Maximum total federal rebate per household (Canada Greener Homes–style cap). */
export const FEDERAL_GRANT_CAP = 5_600;

export type UpgradeId =
  | "heat_pump_air_source"
  | "heat_pump_ground_source"
  | "insulation_attic"
  | "insulation_wall"
  | "windows_doors"
  | "heat_pump_water_heater"
  | "solar_pv"
  | "ev_charger"
  | "air_sealing";

export type GrantUpgradeRow = {
  label: string;
  federal: number;
  ontario_enbridge: number;
  ontario_ieso: number;
  /** Standalone Ontario amount (e.g. EV charger provincial top-up). */
  ontario: number;
};

export const GRANT_DATA: Record<UpgradeId, GrantUpgradeRow> = {
  heat_pump_air_source: {
    label: "Air-source heat pump",
    federal: 5_000,
    ontario_enbridge: 5_000,
    ontario_ieso: 0,
    ontario: 0,
  },
  heat_pump_ground_source: {
    label: "Ground-source heat pump",
    federal: 5_000,
    ontario_enbridge: 5_000,
    ontario_ieso: 0,
    ontario: 0,
  },
  insulation_attic: {
    label: "Attic insulation",
    federal: 3_500,
    ontario_enbridge: 1_000,
    ontario_ieso: 0,
    ontario: 0,
  },
  insulation_wall: {
    label: "Wall insulation",
    federal: 3_500,
    ontario_enbridge: 1_000,
    ontario_ieso: 0,
    ontario: 0,
  },
  windows_doors: {
    label: "Windows & doors",
    federal: 2_500,
    ontario_enbridge: 500,
    ontario_ieso: 0,
    ontario: 0,
  },
  heat_pump_water_heater: {
    label: "Heat pump water heater",
    federal: 1_000,
    ontario_enbridge: 500,
    ontario_ieso: 0,
    ontario: 0,
  },
  solar_pv: {
    label: "Solar PV",
    federal: 0,
    ontario_enbridge: 0,
    ontario_ieso: 5_000,
    ontario: 0,
  },
  ev_charger: {
    label: "EV charger",
    federal: 600,
    ontario_enbridge: 0,
    ontario_ieso: 0,
    ontario: 250,
  },
  air_sealing: {
    label: "Air sealing",
    federal: 1_000,
    ontario_enbridge: 200,
    ontario_ieso: 0,
    ontario: 0,
  },
};

export type HomeDetails = {
  homeType: string;
  /** Era band label from the calculator (e.g. pre1980, 1980s). */
  yearBuilt: string;
  heatingType: string;
  sqftRange: string;
  /** Defaults to Ontario when omitted. */
  province?: string;
};

/** Representative year for audit scoring from era labels or numeric strings. */
export function effectiveAuditYear(yearBuilt: string): number {
  const key = yearBuilt.trim().toLowerCase().replace(/\s+/g, "");
  const byLabel: Record<string, number> = {
    pre1980: 1975,
    "1980s": 1990,
    "2000s": 2008,
    post2015: 2020,
    before_1980: 1975,
    y1980_1999: 1990,
    y2000_2015: 2008,
    after_2015: 2020,
  };
  if (key in byLabel) return byLabel[key];
  const n = Number(yearBuilt);
  return Number.isFinite(n) ? n : 2000;
}

export type GrantCalculationResult = {
  federal: number;
  ontario: number;
  total: number;
  eligiblePrograms: string[];
};

export type AuditPriorityLevel = "high" | "medium" | "low";

export type CalculatorInput = {
  selectedUpgrades: UpgradeId[];
  homeDetails: HomeDetails;
};

const PROGRAM_FEDERAL = "Canada Greener Homes Grant (federal)";
const PROGRAM_ENBRIDGE = "Enbridge Home Efficiency Rebate Plus (Ontario)";
const PROGRAM_IESO = "IESO / provincial clean energy incentives (Ontario)";
const PROGRAM_ONTARIO_EV = "Ontario EV charger rebate";

function isUpgradeId(id: string): id is UpgradeId {
  return id in GRANT_DATA;
}

function ontarioEligible(homeDetails: HomeDetails): boolean {
  const p = homeDetails.province ?? "ON";
  return p === "ON";
}

/**
 * Sums federal and Ontario rebates for selected upgrades, applies the federal
 * household cap, and lists programs that apply.
 */
export function calculateGrants(
  selectedUpgrades: string[],
  homeDetails: HomeDetails
): GrantCalculationResult {
  const ontarioOn = ontarioEligible(homeDetails);

  let federalUncapped = 0;
  let ontarioTotal = 0;
  let touchedFederal = false;
  let touchedEnbridge = false;
  let touchedIeso = false;
  let touchedOntarioEv = false;

  for (const raw of selectedUpgrades) {
    if (!isUpgradeId(raw)) continue;
    const row = GRANT_DATA[raw];
    if (row.federal > 0) {
      federalUncapped += row.federal;
      touchedFederal = true;
    }
    if (ontarioOn) {
      if (row.ontario_enbridge > 0) {
        ontarioTotal += row.ontario_enbridge;
        touchedEnbridge = true;
      }
      if (row.ontario_ieso > 0) {
        ontarioTotal += row.ontario_ieso;
        touchedIeso = true;
      }
      if (row.ontario > 0) {
        ontarioTotal += row.ontario;
        touchedOntarioEv = true;
      }
    }
  }

  const federal = Math.min(federalUncapped, FEDERAL_GRANT_CAP);
  const total = federal + ontarioTotal;

  const eligiblePrograms: string[] = [];
  if (touchedFederal) eligiblePrograms.push(PROGRAM_FEDERAL);
  if (touchedEnbridge) eligiblePrograms.push(PROGRAM_ENBRIDGE);
  if (touchedIeso) eligiblePrograms.push(PROGRAM_IESO);
  if (touchedOntarioEv) eligiblePrograms.push(PROGRAM_ONTARIO_EV);

  return {
    federal,
    ontario: ontarioTotal,
    total,
    eligiblePrograms,
  };
}

/**
 * Retrofit audit urgency: older homes and fossil heating score higher.
 */
function normalizeHeatingType(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function auditPriority(homeDetails: HomeDetails): AuditPriorityLevel {
  const year = effectiveAuditYear(homeDetails.yearBuilt);
  const h = normalizeHeatingType(homeDetails.heatingType);

  const fossil =
    h === "oil" ||
    h === "natural_gas" ||
    h === "naturalgas" ||
    h === "gas" ||
    h === "propane";

  const older = year < 1990;
  const midAge = year >= 1990 && year < 2005;

  if (fossil || older) return "high";
  if (midAge || h === "electric" || h === "other") return "medium";
  if (h === "heat_pump" || h === "heatpump") return "low";
  return "medium";
}

/** Ontario Greener Homes audit urgency scorer (older + fossil heating → high). */
export const AUDIT_PRIORITY = auditPriority;

/** All upgrade keys for forms and validation. */
export const UPGRADE_IDS: UpgradeId[] = Object.keys(GRANT_DATA) as UpgradeId[];

export function estimateEligibleAmounts(input: CalculatorInput) {
  const { federal, ontario, total } = calculateGrants(
    input.selectedUpgrades,
    input.homeDetails
  );
  const priority = auditPriority(input.homeDetails);
  const urgencyFit =
    priority === "high" ? 95 : priority === "medium" ? 75 : 55;
  const federalUtil =
    FEDERAL_GRANT_CAP > 0
      ? Math.min(100, Math.round((federal / FEDERAL_GRANT_CAP) * 100))
      : 0;

  return [
    {
      programId: "federal-capped",
      name: `${PROGRAM_FEDERAL} (cap $${FEDERAL_GRANT_CAP.toLocaleString("en-CA")})`,
      maxAmount: FEDERAL_GRANT_CAP,
      fitScore: federalUtil,
      estimatedAward: federal,
    },
    {
      programId: "ontario-provincial",
      name: "Ontario rebates (Enbridge HER+ / IESO / EV, where applicable)",
      maxAmount: ontario,
      fitScore: ontario > 0 ? 100 : 0,
      estimatedAward: ontario,
    },
    {
      programId: "combined-total",
      name: "Total estimated incentives (federal capped + Ontario)",
      maxAmount: total,
      fitScore: urgencyFit,
      estimatedAward: total,
    },
  ];
}

export function totalEstimatedFunding(input: CalculatorInput) {
  return calculateGrants(input.selectedUpgrades, input.homeDetails).total;
}
