import { NextResponse } from "next/server";

import { getInstallerEmbedConfig } from "@/lib/installerEmbedConfig";
import { fromNextParam } from "@/lib/resolveRouteParams";

/**
 * Embed config for tooling / demos. Prefer keeping `webhookUrl` server-only once you add auth.
 */
export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: { installerId: string } | Promise<{ installerId: string }>;
  }
) {
  const { installerId } = await fromNextParam(params);
  const config = getInstallerEmbedConfig(installerId);
  if (!config) {
    return NextResponse.json({ error: "Unknown installer" }, { status: 404 });
  }

  return NextResponse.json({
    primaryColor: config.primaryColor,
    companyName: config.companyName,
    logoUrl: config.logoUrl,
    webhookUrl: config.webhookUrl,
  });
}
