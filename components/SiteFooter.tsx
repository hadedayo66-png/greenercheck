export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 py-8">
      <div className="mx-auto max-w-3xl px-5 text-center text-xs leading-relaxed text-neutral-500 md:px-6">
        Built in Barrie, Ontario · Not affiliated with NRCan · Grant amounts
        subject to change · {year}
      </div>
    </footer>
  );
}
