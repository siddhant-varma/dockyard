/**
 * AI provider check — validates the API key works by hitting the models endpoint.
 *
 * Supports Anthropic, OpenAI, and Groq. Each provider has a different
 * models list endpoint and auth header format.
 *
 * @module health/checks/ai-provider
 */

import { getAiConfig } from "@/lib/ai/config";
import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Map of provider → env var name for the API key. */
const PROVIDER_KEY_VARS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  groq: "GROQ_API_KEY",
};

/** Map of provider → models endpoint URL. */
const PROVIDER_ENDPOINTS: Record<string, string> = {
  anthropic: "https://api.anthropic.com/v1/models",
  openai: "https://api.openai.com/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
};

/** Build auth headers for the given provider. */
function buildHeaders(
  provider: string,
  apiKey: string
): Record<string, string> {
  if (provider === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Accept: "application/json",
    };
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

/** Check AI provider API key validity by listing models. */
export async function checkAiProvider(): Promise<DeepCheckResult> {
  const start = performance.now();
  const config = getAiConfig();
  const keyVar = PROVIDER_KEY_VARS[config.provider];
  const apiKey = keyVar ? process.env[keyVar] : undefined;

  if (!apiKey) {
    return {
      slug: "ai",
      name: "AI Provider",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: `Not configured (optional) — ${keyVar ?? "unknown key var"} not set`,
    };
  }

  const endpoint = PROVIDER_ENDPOINTS[config.provider];
  if (!endpoint) {
    return {
      slug: "ai",
      name: "AI Provider",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: `Unknown provider: ${config.provider}`,
    };
  }

  try {
    const response = await fetch(endpoint, {
      headers: buildHeaders(config.provider, apiKey),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        slug: "ai",
        name: "AI Provider",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `${config.provider} API key invalid (HTTP ${response.status})`,
      };
    }

    if (!response.ok) {
      return {
        slug: "ai",
        name: "AI Provider",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `${config.provider}: HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "ai",
      name: "AI Provider",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "ai",
      name: "AI Provider",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}
