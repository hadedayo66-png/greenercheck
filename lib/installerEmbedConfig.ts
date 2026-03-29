export type { InstallerEmbedConfig } from "./installerEmbedTypes";

export { INSTALLER_EMBED_CONFIGS } from "./constants";

import { INSTALLER_EMBED_CONFIGS } from "./constants";
import type { InstallerEmbedConfig } from "./installerEmbedTypes";

export function getInstallerEmbedConfig(
  installerId: string
): InstallerEmbedConfig | null {
  const row = INSTALLER_EMBED_CONFIGS[installerId];
  return row ?? null;
}

export function sanitizeHexColor(input: string | undefined | null): string | null {
  if (!input || typeof input !== "string") return null;
  const t = input.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) return t;
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  if (/^#[0-9a-fA-F]{8}$/.test(t)) return t;
  return null;
}
