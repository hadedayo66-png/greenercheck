import Link from "next/link";

type SiteNavProps = {
  variant?: "home" | "installers";
};

export function SiteNav({ variant = "home" }: SiteNavProps) {
  return (
    <header className="border-b border-neutral-200/80 bg-white">
      <nav
        className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-6"
        aria-label="Main"
      >
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-emerald-800 transition hover:text-emerald-900"
        >
          GreenerCheck
        </Link>
        {variant === "home" ? (
          <Link
            href="/for-installers"
            className="text-sm font-medium text-neutral-600 transition hover:text-emerald-800"
          >
            For installers →
          </Link>
        ) : (
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 transition hover:text-emerald-800"
          >
            Homeowner calculator →
          </Link>
        )}
      </nav>
    </header>
  );
}
