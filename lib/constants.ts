import type { InstallerEmbedConfig } from "./installerEmbedTypes";

/**
 * Installer embed defaults (keys = installerId in /embed/[id]).
 * Edited here for white-label branding; validated by scripts/check-vibe.mjs.
 */
export const INSTALLER_EMBED_CONFIGS: Record<string, InstallerEmbedConfig> = {
  demo: {
    primaryColor: "#f97316",
    companyName: "Sunrise Energy",
    /** Optional default logo (absolute URL). */
    logoUrl: "",
    webhookUrl: null,
  },
};
