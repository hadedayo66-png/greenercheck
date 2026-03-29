/**
 * Loaded by node scripts/check-vibe.mjs via tsx.
 */
import { INSTALLER_EMBED_CONFIGS } from "../lib/constants";

function main(): void {
  const configs = INSTALLER_EMBED_CONFIGS;
  const entries = Object.entries(configs);

  console.log(`\nVibe check: ${entries.length} installer config(s)...`);

  const errors = entries.flatMap(([slug, config]) => {
    const issues: string[] = [];

    if (slug === "demo") {
      if (config.primaryColor !== "#f97316") {
        issues.push(
          `Demo primaryColor: expected #f97316, got ${config.primaryColor}`
        );
      }
      if (config.companyName !== "Sunrise Energy") {
        issues.push(
          `Demo companyName: expected "Sunrise Energy", got "${config.companyName}"`
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

    if (config.primaryColor && !config.primaryColor.startsWith("#")) {
      issues.push(
        `${slug}: primaryColor must start with # (not URL-encoded %23)`
      );
    }

    if (
      config.primaryColor &&
      !/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(
        config.primaryColor.trim()
      )
    ) {
      issues.push(`${slug}: primaryColor is not valid hex`);
    }

    return issues;
  });

  if (errors.length === 0) {
    console.log("Configuration is production-ready.\n");
  } else {
    console.error("Vibe check failed:\n");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

main();
