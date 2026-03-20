/**
 * AI Provider config category preset for DockYard.
 *
 * Creates a set of predefined config entries for AI provider configuration
 * with rich input types (dropdowns, sliders, masked passwords).
 */

import { upsertConfigEntry } from "../service";

/** AI provider config entry definitions with rich input metadata. */
const AI_PROVIDER_ENTRIES = [
  {
    key: "AI_PROVIDER",
    displayName: "AI Provider",
    description: "The AI provider to use for summaries and analysis",
    inputType: "select",
    inputOptions: { options: ["openai", "anthropic", "groq", "ollama"] },
    defaultValue: "anthropic",
    isSecret: false,
  },
  {
    key: "AI_API_KEY",
    displayName: "API Key",
    description: "Authentication key for the AI provider API",
    inputType: "password",
    inputOptions: null,
    defaultValue: "",
    isSecret: true,
  },
  {
    key: "AI_MODEL",
    displayName: "Model",
    description: "AI model to use (depends on selected provider)",
    inputType: "select",
    inputOptions: {
      options: [
        "claude-sonnet-4-5-20250514",
        "claude-haiku-4-5-20251001",
        "gpt-4o",
        "gpt-4o-mini",
        "llama-3.3-70b-versatile",
      ],
    },
    defaultValue: "claude-sonnet-4-5-20250514",
    isSecret: false,
  },
  {
    key: "AI_TEMPERATURE",
    displayName: "Temperature",
    description: "Controls randomness: 0 = deterministic, 2 = creative",
    inputType: "slider",
    inputOptions: { min: 0, max: 2, step: 0.1 },
    defaultValue: "0.7",
    isSecret: false,
  },
  {
    key: "AI_MAX_TOKENS",
    displayName: "Max Tokens",
    description: "Maximum tokens per AI response (100-128000)",
    inputType: "number",
    inputOptions: { min: 100, max: 128000 },
    defaultValue: "4096",
    isSecret: false,
  },
] as const;

/**
 * Apply the AI Provider config preset to a project.
 *
 * Creates config entries with rich input types for AI provider settings.
 * Existing entries with the same keys will be updated with the preset
 * metadata (input type, options) but values are only set for new entries.
 *
 * @param projectId - The project's database ID
 * @param userId - The applying user's ID (for audit)
 * @returns Number of entries created or updated
 */
export async function applyAiProviderPreset(
  projectId: string,
  userId?: string
): Promise<{ applied: number; entries: string[] }> {
  const entries: string[] = [];

  for (const entry of AI_PROVIDER_ENTRIES) {
    await upsertConfigEntry(projectId, entry.key, entry.defaultValue, {
      category: "ai_provider",
      displayName: entry.displayName,
      description: entry.description,
      inputType: entry.inputType,
      inputOptions: entry.inputOptions,
      isSecret: entry.isSecret,
      changeReason: "Applied AI Provider preset",
      changedBy: userId,
    });
    entries.push(entry.key);
  }

  return { applied: entries.length, entries };
}
