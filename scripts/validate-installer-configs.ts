/**
 * Validates INSTALLER_EMBED_CONFIGS before deploy.
 * Run: npm run validate:installers
 */
import { INSTALLER_EMBED_CONFIGS } from "../lib/installerEmbedConfig";

function validate(): void {
  const configs = INSTALLER_EMBED_CONFIGS;
  const entries = Object.entries(configs);

  console.log(`\nChecking ${entries.length} installer config(s)...`);

  const errors = entries.flatMap(([slug, config]) => {
    const issues: string[] = [];

    if (slug === "demo") {
      if (config.primaryColor !== "#f97316") {
        issues.push(
          `Demo color mismatch: expected #f97316, got ${config.primaryColor}`
        );
      }
      if (config.companyName !== "Sunrise Energy") {
        issues.push(
          `Demo companyName: expected Sunrise Energy, got ${config.companyName}`
        );
      }
    }

    if (!config.companyName?.trim()) {
      issues.push(`${slug}: Missing or empty companyName`);
    }

    if (!config.primaryColor?.trim()) {
      issues.push(`${slug}: Missing or empty primaryColor`);
    }

    if (typeof config.logoUrl !== "string") {
      issues.push(`${slug}: logoUrl must be a string (use "" if none)`);
    }

    if (
      config.primaryColor &&
      !config.primaryColor.startsWith("#")
    ) {
      issues.push(
        `${slug}: primaryColor "${config.primaryColor}" must start with # (not URL-encoded %23 in config)`
      );
    }

    if (
      config.primaryColor &&
      !/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(
        config.primaryColor.trim()
      )
    ) {
      issues.push(
        `${slug}: primaryColor "${config.primaryColor}" is not a valid hex (#RGB, #RRGGBB, or #RRGGBBAA)`
      );
    }

    return issues;
  });

  if (errors.length === 0) {
    console.log("Installer embed configs look good.\n");
  } else {
    console.error("Installer config validation failed:\n");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

validate();
