import type { ReactNode } from "react";

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 bg-neutral-50 antialiased">{children}</div>
  );
}
