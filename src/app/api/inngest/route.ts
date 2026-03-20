import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { healthCheck } from "@/inngest/functions/health-check";
import { projectScanner } from "@/inngest/functions/project-scanner";
import { hetznerMetrics } from "@/inngest/functions/hetzner-metrics";
import { billingCalculator } from "@/inngest/functions/billing-calculator";
import { alertEvaluator } from "@/inngest/functions/alert-evaluator";
import { alertEscalation } from "@/inngest/functions/alert-escalation";
import { signalProcessor } from "@/inngest/functions/signal-processor";
import { deployTracker } from "@/inngest/functions/deploy-tracker";
import { sloCalculator } from "@/inngest/functions/slo-calculator";
import { autoRollback } from "@/inngest/functions/auto-rollback";
import { confidenceScorer } from "@/inngest/functions/confidence-scorer";
import { aiSummary } from "@/inngest/functions/ai-summary";

/**
 * Inngest API route handler.
 * Serves all registered Inngest functions to the Inngest dev server
 * or Inngest Cloud for execution.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    healthCheck,
    projectScanner,
    hetznerMetrics,
    billingCalculator,
    alertEvaluator,
    alertEscalation,
    signalProcessor,
    deployTracker,
    sloCalculator,
    autoRollback,
    confidenceScorer,
    aiSummary,
  ],
});
