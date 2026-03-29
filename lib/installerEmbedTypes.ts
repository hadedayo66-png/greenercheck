export type InstallerEmbedConfig = {
  primaryColor: string;
  companyName: string;
  logoUrl: string;
  /** Server-only: POST /api/installer/[id]/webhook; not exposed to untrusted clients in production. */
  webhookUrl: string | null;
};
