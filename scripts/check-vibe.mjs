import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "check-vibe-runner.ts");

// Quote runner path so spaces in the project directory (e.g. "AI Micro SaaS") are preserved.
const q =
  process.platform === "win32"
    ? `"${runner.replace(/"/g, '\\"')}"`
    : JSON.stringify(runner);

try {
  execSync(`npx --yes tsx ${q}`, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(0);
} catch (e) {
  const code = typeof e?.status === "number" ? e.status : 1;
  process.exit(code);
}
