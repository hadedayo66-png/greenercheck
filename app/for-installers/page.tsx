"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

const FAQ_ITEMS = [
  {
    id: "heat-pump",
    q: "Does this work for heat pump installers too?",
    a: "Yes — covers all NRCan-eligible upgrades.",
  },
  {
    id: "branding",
    q: "Can I use my own branding?",
    a: "Yes, we set it up for you within 24 hours.",
  },
  {
    id: "leads",
    q: "What happens with the leads?",
    a: "Sent directly to your email. We never contact them.",
  },
  {
    id: "amounts",
    q: "Is this up to date with 2024 grant amounts?",
    a: "Yes, updated quarterly.",
  },
] as const;

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/20";

function EmbedSnippetSection() {
  const baseUrl = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com").replace(
        /\/$/,
        ""
      ),
    []
  );
  const snippet = useMemo(
    () =>
      `<script src="${baseUrl}/embed.js" data-installer-id="demo" async></script>`,
    [baseUrl]
  );
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [snippet]);

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-6">
      <h2 className="text-center text-lg font-semibold text-neutral-900">
        Embed on your site
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-neutral-600">
        Drop in one script tag — the calculator runs in a 700px-tall iframe with
        your colours and &ldquo;Powered by&rdquo; branding. Leads can post to
        your webhook via our server (configure per installer ID).
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            HTML snippet
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            aria-live="polite"
            className={`inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${
              copied
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="max-h-[220px] overflow-x-auto overflow-y-auto p-4 text-left">
          <code className="text-[13px] leading-relaxed text-emerald-100/95">
            {snippet}
          </code>
        </pre>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-500">
        Set <code className="rounded bg-neutral-200/80 px-1 py-0.5 text-neutral-800">NEXT_PUBLIC_SITE_URL</code>{" "}
        in production so this shows your live domain. Optional:{" "}
        <code className="rounded bg-neutral-200/80 px-1 py-0.5 text-neutral-800">
          data-primary-color
        </code>
        ,{" "}
        <code className="rounded bg-neutral-200/80 px-1 py-0.5 text-neutral-800">
          data-company-name
        </code>
        ,{" "}
        <code className="rounded bg-neutral-200/80 px-1 py-0.5 text-neutral-800">
          data-logo-url
        </code>
        .
      </p>
    </section>
  );
}

export default function ForInstallersPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/installer-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, website }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || data.success !== true) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Something went wrong"
        );
      }
      setStatus("success");
      setMessage("Thanks — we will email you shortly to book your call.");
      setName("");
      setCompany("");
      setEmail("");
      setWebsite("");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not send your inquiry"
      );
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <SiteNav variant="installers" />

      <section className="border-b border-emerald-100/60 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center md:px-6 md:py-20">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            For Ontario installers
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-4xl">
            Add a grant calculator to your website —{" "}
            <span className="text-emerald-700">free for 30 days</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 md:text-lg">
            Your customers ask about Greener Homes grants on every call. Give
            them the answer before they call.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-6">
        <h2 className="text-center text-lg font-semibold text-neutral-900">
          How it works
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {[
            {
              step: "1",
              title: "We set up your branded calculator",
              body: "Your logo, your colours.",
            },
            {
              step: "2",
              title: "Homeowners fill it in on your site",
              body: "Takes 60 seconds.",
            },
            {
              step: "3",
              title: "You get a qualified lead notification",
              body: "Name, email, home details, grant estimate.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm md:text-left"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                {item.step}
              </span>
              <h3 className="mt-4 text-base font-semibold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <EmbedSnippetSection />
      </section>

      <section className="border-y border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-5 md:px-6">
          <h2 className="text-center text-lg font-semibold text-neutral-900">
            Pricing
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-8">
            <div className="relative flex flex-col rounded-xl border-2 border-emerald-500 bg-white p-8 shadow-md ring-2 ring-emerald-500/20">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-3 py-0.5 text-xs font-semibold text-white">
                Most popular
              </span>
              <h3 className="text-lg font-semibold text-neutral-900">
                Starter
              </h3>
              <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-800">
                CAD $179
                <span className="text-base font-semibold text-neutral-500">
                  /mo
                </span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-neutral-600">
                <li>1 calculator widget</li>
                <li>Unlimited leads</li>
                <li>Email notifications</li>
              </ul>
            </div>
            <div className="flex flex-col rounded-xl border border-neutral-200 bg-neutral-50/80 p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">Pro</h3>
              <p className="mt-3 text-3xl font-bold tabular-nums text-neutral-900">
                CAD $299
                <span className="text-base font-semibold text-neutral-500">
                  /mo
                </span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-neutral-600">
                <li>3 widgets</li>
                <li>CRM integration</li>
                <li>Monthly lead report</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 py-16 md:px-6">
        <h2 className="text-center text-lg font-semibold text-neutral-900">
          FAQ
        </h2>
        <Accordion.Root
          type="single"
          collapsible
          className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-4 shadow-sm md:px-6"
        >
          {FAQ_ITEMS.map((item) => (
            <Accordion.Item key={item.id} value={item.id} className="py-1">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-neutral-900 outline-none hover:text-emerald-900">
                  {item.q}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-sm leading-relaxed text-neutral-600">
                <p className="pb-4 pr-6 pt-0">{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </section>

      <section className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-lg px-5 md:px-6">
          <h2 className="text-center text-lg font-semibold text-neutral-900">
            Book a call
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Tell us about your business — we&apos;ll follow up within one
            business day.
          </p>
          <form onSubmit={handleInquirySubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="inq-name"
                className="mb-1.5 block text-xs font-medium text-neutral-700"
              >
                Name
              </label>
              <input
                id="inq-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="inq-company"
                className="mb-1.5 block text-xs font-medium text-neutral-700"
              >
                Company
              </label>
              <input
                id="inq-company"
                name="company"
                type="text"
                required
                autoComplete="organization"
                className={inputClass}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="inq-email"
                className="mb-1.5 block text-xs font-medium text-neutral-700"
              >
                Email
              </label>
              <input
                id="inq-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="inq-website"
                className="mb-1.5 block text-xs font-medium text-neutral-700"
              >
                Website URL
              </label>
              <input
                id="inq-website"
                name="website"
                type="text"
                required
                placeholder="https://yoursite.ca"
                className={inputClass}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Book a 15-min call"}
            </button>
            {message && (
              <p
                className={
                  status === "error"
                    ? "text-center text-sm text-red-600"
                    : "text-center text-sm text-emerald-800"
                }
                role="status"
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
