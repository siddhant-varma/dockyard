/**
 * Tests page — /watchtower/[slug]/tests
 *
 * Server component. Wires TestRunner and TestResults components for
 * running and viewing test suites. Glass Observatory styling.
 */

import { TestRunner } from "@/components/watchtower/test-runner";
import { TestResults } from "@/components/watchtower/test-results";

type Params = Promise<{ slug: string }>;

export default async function TestsPage({ params }: { params: Params }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Test Suites</h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Run and review smoke tests and health check suites for this project.
        </p>
      </div>

      {/* Test runner controls */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
        <TestRunner projectSlug={slug} />
      </div>

      {/* Test results */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground/80">
          Recent Results
        </h2>
        <TestResults runs={[]} />
      </div>
    </div>
  );
}
