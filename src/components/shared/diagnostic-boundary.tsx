/**
 * DiagnosticBoundary — server component for diagnostic mode.
 *
 * Wraps an async data-fetching function: on success, renders children with
 * the fetched data. On error, renders a styled error card with details.
 *
 * Only active when `DOCKYARD_DIAGNOSTIC=true`. In normal mode, errors
 * propagate as usual (no catch).
 *
 * @example
 * ```tsx
 * <DiagnosticBoundary label="Projects List" fetcher={() => db.query.projects.findMany()}>
 *   {(projects) => <ProjectGrid projects={projects} />}
 * </DiagnosticBoundary>
 * ```
 */

import { isDiagnosticMode } from "@/lib/env";

/** Props for the DiagnosticBoundary component. */
interface DiagnosticBoundaryProps<T> {
  /** Human-readable label for this data section (e.g., "Projects List"). */
  label: string;
  /** Async function that fetches the real data. */
  fetcher: () => Promise<T>;
  /** Render function called with the fetched data on success. */
  children: (data: T) => React.ReactNode;
}

/**
 * Diagnostic error card — displayed when a data fetch fails in diagnostic mode.
 * Shows a red-bordered card with the component label and error message.
 */
function DiagnosticErrorCard({
  label,
  error,
}: {
  label: string;
  error: string;
}) {
  return (
    <div className="rounded-lg border-2 border-red-500/50 bg-red-500/5 p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <p className="text-sm font-medium text-red-400">{label}</p>
      </div>
      <p className="mt-1 text-xs text-red-400/70">{error}</p>
      <p className="mt-2 text-[10px] text-foreground/30">
        {new Date().toISOString()}
      </p>
    </div>
  );
}

/**
 * Diagnostic success indicator — thin green border shown in diagnostic mode
 * when a data fetch succeeds, so the health status is visible.
 */
function DiagnosticSuccessWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute -top-1 left-2 z-10 rounded-full bg-emerald-500/10 px-2 py-0.5">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-emerald-400/70">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Async server component that wraps a data fetcher with diagnostic error handling.
 *
 * In diagnostic mode: catches fetch errors and renders an error card.
 * In normal mode: calls the fetcher without catching (errors propagate to Next.js error boundary).
 */
export async function DiagnosticBoundary<T>({
  label,
  fetcher,
  children,
}: DiagnosticBoundaryProps<T>) {
  if (!isDiagnosticMode) {
    // Normal mode — no error catching, let Next.js handle errors
    const data = await fetcher();
    return <>{children(data)}</>;
  }

  // Diagnostic mode — catch errors and render error card.
  // Data fetch is separated from JSX to satisfy the react-hooks/error-boundaries lint rule.
  const result = await fetcher().then(
    (data) => ({ ok: true as const, data }),
    (err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : "Unknown error",
    }),
  );

  if (!result.ok) {
    return <DiagnosticErrorCard label={label} error={result.error} />;
  }

  return (
    <DiagnosticSuccessWrapper label={label}>
      {children(result.data)}
    </DiagnosticSuccessWrapper>
  );
}

export { DiagnosticErrorCard };
