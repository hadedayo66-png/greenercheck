import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmbedCalculatorClient } from "@/components/EmbedCalculatorClient";
import { getInstallerEmbedConfig } from "@/lib/installerEmbedConfig";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ installerId: string }>;
}): Promise<Metadata> {
  const { installerId } = await params;
  const config = getInstallerEmbedConfig(installerId);
  return {
    title: config
      ? `Grant calculator · ${config.companyName}`
      : "Grant calculator",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ installerId: string }>;
  searchParams: Promise<{
    primaryColor?: string;
    companyName?: string;
    logoUrl?: string;
  }>;
}) {
  const { installerId } = await params;
  const { primaryColor, companyName, logoUrl } = await searchParams;

  const config = getInstallerEmbedConfig(installerId);
  if (!config) notFound();

  const resolvedColor = primaryColor
    ? primaryColor.startsWith("#")
      ? primaryColor
      : "#" + primaryColor
    : (config?.primaryColor ?? "#16a34a");
  const resolvedName =
    companyName ?? config?.companyName ?? "GreenerCheck";
  const resolvedLogo = logoUrl ?? config?.logoUrl ?? "";

  console.log("Embed params:", {
    installerId,
    primaryColor,
    companyName,
    resolvedColor,
    resolvedName,
  });

  return (
    <EmbedCalculatorClient
      installerId={installerId}
      primaryColor={resolvedColor}
      companyName={resolvedName}
      logoUrl={resolvedLogo}
    />
  );
}
