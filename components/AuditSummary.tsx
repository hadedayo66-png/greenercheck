import { Sparkles } from "lucide-react";

type Props = {
  text: string | null;
  loading?: boolean;
  error?: string | null;
};

export function AuditSummary({ text, loading, error }: Props) {
  const hasText = Boolean(text && text.length > 0);
  const showPlaceholder = !loading && !error && !hasText;

  return (
    <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-blue-50/80 to-white">
      <div className="flex items-center gap-2 border-b border-blue-100 px-4 py-3">
        <Sparkles className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-neutral-900">
          AI audit summary (Claude)
        </h3>
      </div>
      <div className="px-4 py-4 text-sm leading-relaxed text-neutral-700">
        {loading && !hasText && (
          <p className="animate-pulse text-neutral-500">Generating summary…</p>
        )}
        {!loading && error && (
          <p className="text-red-600" role="alert">
            {error}
          </p>
        )}
        {hasText && (
          <div className="whitespace-pre-wrap">
            {text}
            {loading && (
              <span
                className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-neutral-400 align-middle"
                aria-hidden="true"
              />
            )}
          </div>
        )}
        {showPlaceholder && (
          <p className="text-neutral-500">
            Run the calculator to generate an AI-assisted audit based on your
            inputs.
          </p>
        )}
      </div>
    </div>
  );
}
