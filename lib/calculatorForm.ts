import { z } from "zod";

import type { CalculatorInput, UpgradeId } from "@/lib/grants";
import { UPGRADE_IDS } from "@/lib/grants";

const upgradeIdSchema = z.custom<UpgradeId>(
  (v): v is UpgradeId =>
    typeof v === "string" && (UPGRADE_IDS as readonly string[]).includes(v)
);

export const calculatorFormSchema = z.object({
  homeType: z.enum(["detached", "semi_detached", "townhouse", "condo"]),
  yearBuiltBand: z.enum([
    "before_1980",
    "y1980_1999",
    "y2000_2015",
    "after_2015",
  ]),
  heatingType: z.enum([
    "natural_gas_furnace",
    "electric_baseboard",
    "oil_furnace",
    "propane",
    "heat_pump_installed",
  ]),
  sqftBand: z.enum(["under_1000", "1000_1500", "1500_2500", "over_2500"]),
  selectedUpgrades: z
    .array(upgradeIdSchema)
    .min(1, "Select at least one upgrade"),
  firstName: z.string().min(1, "Enter your first name").max(80),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["homeowner", "contractor", "energy_auditor"]),
  sendChecklist: z.boolean(),
});

export type CalculatorFormData = z.infer<typeof calculatorFormSchema>;

export const calculatorStep1Schema = calculatorFormSchema.pick({
  homeType: true,
  yearBuiltBand: true,
  heatingType: true,
  sqftBand: true,
});

export const calculatorStep2Schema = calculatorFormSchema.pick({
  selectedUpgrades: true,
});

const YEAR_BAND_TO_LABEL: Record<CalculatorFormData["yearBuiltBand"], string> =
  {
    before_1980: "pre1980",
    y1980_1999: "1980s",
    y2000_2015: "2000s",
    after_2015: "post2015",
  };

const HEATING_TO_GRANTS: Record<
  CalculatorFormData["heatingType"],
  string
> = {
  natural_gas_furnace: "natural_gas",
  electric_baseboard: "electric",
  oil_furnace: "oil",
  propane: "propane",
  heat_pump_installed: "heat_pump",
};

const SQFT_TO_RANGE: Record<CalculatorFormData["sqftBand"], string> = {
  under_1000: "under_1000",
  "1000_1500": "1000_1500",
  "1500_2500": "1500_2500",
  over_2500: "over_2500",
};

/** Maps wizard answers to {@link CalculatorInput} for grants + Claude. */
export function mapCalculatorFormToInput(
  data: CalculatorFormData
): CalculatorInput {
  return {
    selectedUpgrades: data.selectedUpgrades,
    homeDetails: {
      homeType: data.homeType,
      yearBuilt: YEAR_BAND_TO_LABEL[data.yearBuiltBand],
      heatingType: HEATING_TO_GRANTS[data.heatingType],
      sqftRange: SQFT_TO_RANGE[data.sqftBand],
      province: "ON",
    },
  };
}
