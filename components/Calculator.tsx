"use client";

import * as Select from "@radix-ui/react-select";
import {
  AirVent,
  AppWindow,
  BatteryCharging,
  Check,
  ChevronDown,
  Droplets,
  Fan,
  Globe2,
  Layers,
  Sun,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import type { ZodError } from "zod";

import type { UpgradeId } from "@/lib/grants";
import {
  calculatorFormSchema,
  calculatorStep1Schema,
  calculatorStep2Schema,
  type CalculatorFormData,
} from "@/lib/calculatorForm";

export type { CalculatorFormData } from "@/lib/calculatorForm";

const EMBED_PRIMARY_BG = "var(--embed-primary, #16a34a)";

const INSULATION_IDS: readonly UpgradeId[] = [
  "insulation_attic",
  "insulation_wall",
];

function hasInsulationPair(ids: UpgradeId[]) {
  return INSULATION_IDS.every((id) => ids.includes(id));
}

function toggleInsulationPair(ids: UpgradeId[]): UpgradeId[] {
  if (hasInsulationPair(ids)) {
    return ids.filter((id) => !INSULATION_IDS.includes(id as UpgradeId));
  }
  const without = ids.filter((id) => !INSULATION_IDS.includes(id as UpgradeId));
  return [...without, "insulation_attic", "insulation_wall"];
}

const HOME_TYPES = [
  { value: "detached", label: "Detached" },
  { value: "semi_detached", label: "Semi-detached" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
] as const;

const YEAR_BANDS = [
  { value: "before_1980", label: "Before 1980" },
  { value: "y1980_1999", label: "1980–1999" },
  { value: "y2000_2015", label: "2000–2015" },
  { value: "after_2015", label: "After 2015" },
] as const;

const HEATING_TYPES = [
  { value: "natural_gas_furnace", label: "Natural gas furnace" },
  { value: "electric_baseboard", label: "Electric baseboard" },
  { value: "oil_furnace", label: "Oil furnace" },
  { value: "propane", label: "Propane" },
  {
    value: "heat_pump_installed",
    label: "Heat pump already installed",
  },
] as const;

const SQFT_BANDS = [
  { value: "under_1000", label: "Under 1,000 sq ft" },
  { value: "1000_1500", label: "1,000–1,500 sq ft" },
  { value: "1500_2500", label: "1,500–2,500 sq ft" },
  { value: "over_2500", label: "Over 2,500 sq ft" },
] as const;

type UpgradeRow = {
  id: UpgradeId;
  label: string;
  Icon: typeof Fan;
  /** Toggling adds/removes all ids together (e.g. attic + wall). */
  toggleIds?: readonly UpgradeId[];
};

const UPGRADE_ROWS: UpgradeRow[] = [
  { id: "heat_pump_air_source", label: "Heat pump (air-source)", Icon: Fan },
  { id: "heat_pump_ground_source", label: "Heat pump (ground-source)", Icon: Globe2 },
  {
    id: "insulation_attic",
    label: "Attic / wall insulation",
    Icon: Layers,
    toggleIds: INSULATION_IDS,
  },
  { id: "windows_doors", label: "Windows & doors", Icon: AppWindow },
  {
    id: "heat_pump_water_heater",
    label: "Heat pump water heater",
    Icon: Droplets,
  },
  { id: "solar_pv", label: "Solar PV system", Icon: Sun },
  { id: "ev_charger", label: "EV charger", Icon: BatteryCharging },
  { id: "air_sealing", label: "Air sealing", Icon: AirVent },
];

const ROLES = [
  { value: "homeowner", label: "Homeowner" },
  { value: "contractor", label: "Contractor" },
  { value: "energy_auditor", label: "Energy auditor" },
] as const;

function applyZodFieldErrors(
  error: ZodError,
  setError: (name: FieldPath<CalculatorFormData>, err: { message: string }) => void
) {
  const flat = error.flatten().fieldErrors;
  for (const key of Object.keys(flat) as (keyof typeof flat)[]) {
    const messages = flat[key];
    if (messages?.[0]) {
      setError(key as FieldPath<CalculatorFormData>, { message: messages[0] });
    }
  }
}

type CalculatorProps = {
  onSubmit: (data: CalculatorFormData) => void | Promise<void>;
  variant?: "default" | "embed";
  /** Embed: partner name from URL or config (shown above the form). */
  companyName?: string;
};

export function Calculator({
  onSubmit,
  variant,
  companyName,
}: CalculatorProps) {
  const resolvedVariant = variant ?? "default";
  const embed = resolvedVariant === "embed";
  const [step, setStep] = useState(0);
  const [sendEmail, setSendEmail] = useState(true);

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    watch,
    getValues,
    formState: { errors },
  } = useForm<CalculatorFormData>({
    defaultValues: {
      homeType: "detached",
      yearBuiltBand: "y1980_1999",
      heatingType: "natural_gas_furnace",
      sqftBand: "1500_2500",
      selectedUpgrades: [],
      firstName: "",
      email: "",
      role: "homeowner",
      sendChecklist: true,
    },
  });

  const selectedUpgrades = watch("selectedUpgrades");

  const goBack = useCallback(() => {
    clearErrors();
    setStep((s) => Math.max(0, s - 1));
  }, [clearErrors]);

  const goNext = useCallback(() => {
    const values = getValues();
    if (step === 0) {
      const r = calculatorStep1Schema.safeParse(values);
      if (!r.success) {
        applyZodFieldErrors(r.error, setError);
        return;
      }
      clearErrors();
      setStep(1);
      return;
    }
    if (step === 1) {
      const r = calculatorStep2Schema.safeParse(values);
      if (!r.success) {
        applyZodFieldErrors(r.error, setError);
        return;
      }
      clearErrors();
      setStep(2);
    }
  }, [step, getValues, setError, clearErrors]);

  function toggleUpgrade(
    primaryId: UpgradeId,
    toggleIds?: readonly UpgradeId[]
  ) {
    const cur = getValues("selectedUpgrades");
    const next = toggleIds?.length
      ? toggleInsulationPair(cur)
      : cur.includes(primaryId)
        ? cur.filter((x) => x !== primaryId)
        : [...cur, primaryId];
    setValue("selectedUpgrades", next, { shouldValidate: true });
    clearErrors("selectedUpgrades");
  }

  function isRowChecked(row: UpgradeRow) {
    if (row.toggleIds?.length) {
      return hasInsulationPair(selectedUpgrades);
    }
    return selectedUpgrades.includes(row.id);
  }

  const selectTriggerClass = embed
    ? "inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[color:var(--embed-primary\\2c #16a34a)] focus:ring-2 focus:ring-black/10"
    : "inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none ring-neutral-900/10 transition hover:border-neutral-300 focus:border-neutral-400 focus:ring-2";

  const inputClass = embed
    ? "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[color:var(--embed-primary\\2c #16a34a)] focus:ring-2 focus:ring-black/10"
    : "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10";

  const progressFillClass = embed
    ? "h-full rounded-full bg-[color:var(--embed-primary\\2c #16a34a)] transition-[width] duration-300 ease-out"
    : "h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out";

  const secondaryBtnClass = embed
    ? "border-2 border-[color:var(--embed-primary\\2c #16a34a)] text-[color:var(--embed-primary\\2c #16a34a)] hover:bg-black/5"
    : "border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50";

  const checklistCheckboxClass = embed
    ? "h-4 w-4 shrink-0 rounded border-neutral-300 text-[color:var(--embed-primary\\2c #16a34a)] focus:outline-none focus:ring-2 focus:ring-[color:var(--embed-primary\\2c #16a34a)]"
    : "h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500";

  const primaryCtaStyle: CSSProperties | undefined = embed
    ? { backgroundColor: EMBED_PRIMARY_BG }
    : undefined;
  const primaryCtaClass = embed
    ? "text-white px-6 py-2.5 rounded-lg w-full mt-4 font-medium transition hover:brightness-[1.06] active:brightness-[0.92]"
    : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium px-6 py-2.5 rounded-lg w-full mt-4";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
      {embed && companyName ? (
        <p className="mb-6 border-b border-neutral-100 pb-4 text-center text-sm font-semibold text-neutral-900">
          {companyName}
        </p>
      ) : null}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-500">
          <span className="text-neutral-700">
            Step {step + 1} of 3
          </span>
          <span>
            {step === 0 && "Your home"}
            {step === 1 && "Upgrades"}
            {step === 2 && "Your details"}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={progressFillClass}
            style={{ width: `${((step + 1) / 3) * 100}%` }}
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={3}
          />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) {
            goNext();
            return;
          }
          const data = getValues();
          const parsed = calculatorFormSchema.safeParse(data);
          if (!parsed.success) {
            applyZodFieldErrors(parsed.error, setError);
            return;
          }
          void Promise.resolve(onSubmit(parsed.data));
        }}
        className="space-y-6"
      >
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Your home
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Tell us about the property you are upgrading.
              </p>
            </div>

            <div className="space-y-5">
              <Field label="Home type">
                <Controller
                  name="homeType"
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className={selectTriggerClass}>
                        <Select.Value placeholder="Select" />
                        <Select.Icon>
                          <ChevronDown
                            className="h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.Viewport className="p-1">
                            {HOME_TYPES.map((opt) => (
                              <Select.Item
                                key={opt.value}
                                value={opt.value}
                                className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-50"
                              >
                                <Select.ItemText>{opt.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
                {errors.homeType && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.homeType.message}
                  </p>
                )}
              </Field>

              <Field label="Year built">
                <Controller
                  name="yearBuiltBand"
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className={selectTriggerClass}>
                        <Select.Value placeholder="Select" />
                        <Select.Icon>
                          <ChevronDown
                            className="h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.Viewport className="p-1">
                            {YEAR_BANDS.map((opt) => (
                              <Select.Item
                                key={opt.value}
                                value={opt.value}
                                className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-50"
                              >
                                <Select.ItemText>{opt.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
                {errors.yearBuiltBand && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.yearBuiltBand.message}
                  </p>
                )}
              </Field>

              <Field label="Current heating">
                <Controller
                  name="heatingType"
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className={selectTriggerClass}>
                        <Select.Value placeholder="Select" />
                        <Select.Icon>
                          <ChevronDown
                            className="h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.Viewport className="p-1">
                            {HEATING_TYPES.map((opt) => (
                              <Select.Item
                                key={opt.value}
                                value={opt.value}
                                className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-50"
                              >
                                <Select.ItemText>{opt.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
                {errors.heatingType && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.heatingType.message}
                  </p>
                )}
              </Field>

              <Field label="Size">
                <Controller
                  name="sqftBand"
                  control={control}
                  render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className={selectTriggerClass}>
                        <Select.Value placeholder="Select" />
                        <Select.Icon>
                          <ChevronDown
                            className="h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.Viewport className="p-1">
                            {SQFT_BANDS.map((opt) => (
                              <Select.Item
                                key={opt.value}
                                value={opt.value}
                                className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-50"
                              >
                                <Select.ItemText>{opt.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
                {errors.sqftBand && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.sqftBand.message}
                  </p>
                )}
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Upgrades you&apos;re considering
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Select everything you might pursue; rebates stack up to program caps.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {UPGRADE_ROWS.map((row) => {
                const Icon = row.Icon;
                const isSelected = isRowChecked(row);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggleUpgrade(row.id, row.toggleIds)}
                    style={
                      embed && isSelected
                        ? {
                            backgroundColor: `color-mix(in srgb, ${EMBED_PRIMARY_BG} 5%, white)`,
                          }
                        : undefined
                    }
                    className={`relative flex flex-col rounded-xl border-2 p-4 text-left text-sm transition-all ${
                      isSelected
                        ? embed
                          ? "border-[color:var(--embed-primary\\2c #16a34a)] ring-1 ring-[color:var(--embed-primary\\2c #16a34a)]"
                          : "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                        : "border-neutral-100 bg-white hover:border-neutral-200"
                    }`}
                  >
                    {isSelected && (
                      <div
                        className={`absolute right-2 top-2 ${
                          embed
                            ? "text-[color:var(--embed-primary\\2c #16a34a)]"
                            : "text-neutral-900"
                        }`}
                        aria-hidden
                      >
                        <Check className="h-5 w-5" strokeWidth={2} />
                      </div>
                    )}
                    <div className="flex items-start gap-3 pr-7">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected
                            ? embed
                              ? "border-[color:var(--embed-primary\\2c #16a34a)] bg-white text-[color:var(--embed-primary\\2c #16a34a)]"
                              : "border-neutral-900 bg-white text-neutral-900"
                            : "border-neutral-200 bg-neutral-50 text-neutral-500"
                        }`}
                      >
                        <Icon
                          className="h-4 w-4"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="font-medium leading-snug text-neutral-900">
                        {row.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.selectedUpgrades && (
              <p className="text-xs text-red-600">
                {errors.selectedUpgrades.message as string}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Your details
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                We use this to personalize your estimate and optional checklist.
              </p>
            </div>

            <div className="space-y-5">
              <Field label="First name">
                <input
                  type="text"
                  autoComplete="given-name"
                  className={inputClass}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </Field>

              <Field label="Email address">
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </Field>

              <fieldset>
                <legend className="mb-2 text-xs font-medium text-neutral-600">
                  I&apos;m a:
                </legend>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 transition hover:border-neutral-300 ${
                        embed
                          ? "has-[:checked]:border-[color:var(--embed-primary\\2c #16a34a)] has-[:checked]:bg-neutral-50"
                          : "has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={r.value}
                        className={
                          embed
                            ? "h-4 w-4 border-neutral-300 text-[color:var(--embed-primary\\2c #16a34a)] focus:ring-[color:var(--embed-primary\\2c #16a34a)]"
                            : "h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        }
                        {...register("role")}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.role.message}
                  </p>
                )}
              </fieldset>

              <label
                htmlFor="send-checklist-email"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700"
              >
                <input
                  id="send-checklist-email"
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSendEmail(checked);
                    setValue("sendChecklist", checked, {
                      shouldValidate: true,
                    });
                  }}
                  className={`mt-0.5 ${checklistCheckboxClass}`}
                />
                <span>
                  Send me my full pre-audit checklist by email
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:justify-between">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className={`${secondaryBtnClass} mt-4 w-full rounded-lg bg-white px-6 py-2.5 font-medium transition`}
              >
                Back
              </button>
            )}
          </div>
          <div>
            {step < 2 ? (
              <button
                type="submit"
                style={primaryCtaStyle}
                className={primaryCtaClass}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                style={primaryCtaStyle}
                className={primaryCtaClass}
              >
                See my grant estimate →
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      {children}
    </div>
  );
}
