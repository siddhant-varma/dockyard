/**
 * AI provider configuration for DockYard summary generation.
 *
 * Configurable via environment variables. Supports OpenAI, Anthropic,
 * and Groq via the Vercel AI SDK multi-provider interface.
 *
 * @example
 * ```ts
 * const config = getAiConfig();
 * // { provider: "anthropic", model: "claude-sonnet-4-5-20250514" }
 * ```
 */

/** Supported AI providers. */
export type AiProvider = "openai" | "anthropic" | "groq";

/** AI configuration for summary generation. */
export interface AiConfig {
  provider: AiProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-5-20250514",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
};

/**
 * Get the AI configuration from environment variables.
 *
 * Environment variables:
 * - DOCKYARD_AI_PROVIDER: "openai" | "anthropic" | "groq" (default: "anthropic")
 * - DOCKYARD_AI_MODEL: Model name (default: provider-specific)
 * - DOCKYARD_AI_MAX_TOKENS: Max tokens per response (default: 2048)
 * - DOCKYARD_AI_TEMPERATURE: Temperature 0-2 (default: 0.3)
 *
 * @returns Validated AI configuration
 */
export function getAiConfig(): AiConfig {
  const provider = (process.env.DOCKYARD_AI_PROVIDER ?? "anthropic") as AiProvider;
  const model =
    process.env.DOCKYARD_AI_MODEL ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.anthropic;
  const maxTokens = Number(process.env.DOCKYARD_AI_MAX_TOKENS) || 2048;
  const temperature = Number(process.env.DOCKYARD_AI_TEMPERATURE) || 0.3;

  return { provider, model, maxTokens, temperature };
}

/** Token usage tracking for a single generation. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

/**
 * Estimate cost from token usage (rough approximations).
 */
export function estimateCost(
  provider: AiProvider,
  promptTokens: number,
  completionTokens: number
): number {
  const rates: Record<AiProvider, { input: number; output: number }> = {
    anthropic: { input: 0.003, output: 0.015 },
    openai: { input: 0.00015, output: 0.0006 },
    groq: { input: 0.00027, output: 0.00027 },
  };

  const rate = rates[provider] ?? rates.anthropic;
  return (promptTokens / 1000) * rate.input + (completionTokens / 1000) * rate.output;
}
