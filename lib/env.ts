export function requireEnv(key: string): string {
  const val = process.env[key];
  if (val === undefined || val.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val.trim();
}
