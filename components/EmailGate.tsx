"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  consent: z.boolean().refine((v) => v === true, {
    message: "Consent is required",
  }),
});

type FormValues = z.infer<typeof schema>;

export function EmailGate() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", consent: false },
  });

  const consent = watch("consent");

  async function submitValid(data: FormValues) {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Friend",
          email: data.email,
          userType: "newsletter",
          homeDetails: {},
          grantResults: {
            federal: 0,
            ontario: 0,
            total: 0,
            eligiblePrograms: [],
          },
          wantsChecklist: false,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !("success" in payload) || payload.success !== true) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Could not subscribe"
        );
      }
      setStatus("success");
      setMessage("You are subscribed. Check your inbox.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function onSubmit(raw: FormValues) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key === "email" || key === "consent") {
          setError(key, { message: issue.message });
        }
      });
      return;
    }
    void submitValid(parsed.data);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-neutral-900">
        Get funding reminders
      </h3>
      <p className="mt-1 text-xs text-neutral-600">
        Optional: we will only email you if you opt in below.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email-gate" className="sr-only">
            Email
          </label>
          <input
            id="email-gate"
            type="email"
            autoComplete="email"
            placeholder="you@organization.org"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="flex items-start gap-3">
          <Checkbox.Root
            id="consent"
            checked={consent}
            onCheckedChange={(v) =>
              setValue("consent", v === true, { shouldValidate: true })
            }
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-400 bg-white data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
          >
            <Checkbox.Indicator>
              <Check
                className="h-3 w-3 text-white"
                strokeWidth={3}
                aria-hidden="true"
              />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="consent" className="text-xs text-neutral-600">
            I agree to receive occasional emails about grant deadlines and
            product updates.
          </label>
        </div>
        {errors.consent && (
          <p className="text-xs text-red-600">{errors.consent.message}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {status === "loading" ? "Submitting…" : "Subscribe"}
        </button>
        {message && (
          <p
            className={
              status === "error" ? "text-sm text-red-600" : "text-sm text-green-700"
            }
            role="status"
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
