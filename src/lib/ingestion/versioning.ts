/**
 * DIP (DockYard Integration Protocol) version parser.
 *
 * Parses the X-DIP-Version header from incoming requests to determine
 * which DIP protocol version a project supports. This controls which
 * features DockYard enables for the project:
 *
 * - Level 0: No DIP — basic discovery only
 * - Level 1: /healthz + /readyz endpoints
 * - Level 2: /metrics (Prometheus format) + Level 1
 * - Level 3: Bidirectional events (CloudEvents) + Level 2
 * - Level 4: Config management via DockYard API + Level 3
 *
 * Version format: "1.0", "2.0", etc. — major version maps to DIP level.
 *
 * @see DOCKYARD-JSON.md for the full DIP protocol specification
 */

/** Supported DIP protocol versions. */
export type DipVersion = "1.0" | "2.0" | "3.0" | "4.0";

/** DIP level (0-4) derived from the version number. */
export type DipLevel = 0 | 1 | 2 | 3 | 4;

/** Result of parsing a DIP version header. */
export interface DipVersionInfo {
  /** Raw version string from the header. */
  raw: string;
  /** Parsed DIP level (0-4). */
  level: DipLevel;
  /** Whether the version is a known/supported version. */
  supported: boolean;
}

/** Map of known DIP versions to their corresponding levels. */
const VERSION_LEVEL_MAP: Record<string, DipLevel> = {
  "1.0": 1,
  "2.0": 2,
  "3.0": 3,
  "4.0": 4,
};

/** The DIP version header name. */
const DIP_VERSION_HEADER = "x-dip-version";

/**
 * Parse the X-DIP-Version header from an incoming HTTP request.
 *
 * Extracts the DIP protocol version from the request headers and
 * maps it to a DIP level. If the header is missing or contains an
 * unrecognized version, returns level 0 (no DIP support).
 *
 * Unknown versions are handled gracefully — they default to level 0
 * and are flagged as unsupported so the caller can log a warning.
 *
 * @param headers - HTTP request headers as a plain object
 * @returns Parsed version info with level and support status
 */
export function parseDipVersion(
  headers: Record<string, string | undefined>
): DipVersionInfo {
  // Header names are case-insensitive in HTTP — normalize to lowercase
  const normalizedHeaders: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  const raw = normalizedHeaders[DIP_VERSION_HEADER];

  if (!raw || raw.trim() === "") {
    return {
      raw: "",
      level: 0,
      supported: false,
    };
  }

  const trimmed = raw.trim();
  const level = VERSION_LEVEL_MAP[trimmed];

  if (level !== undefined) {
    return {
      raw: trimmed,
      level,
      supported: true,
    };
  }

  // Unknown version — try to extract major version number
  const majorMatch = trimmed.match(/^(\d+)\./);
  if (majorMatch) {
    const major = parseInt(majorMatch[1], 10);
    if (major >= 1 && major <= 4) {
      return {
        raw: trimmed,
        level: major as DipLevel,
        supported: false,
      };
    }
  }

  return {
    raw: trimmed,
    level: 0,
    supported: false,
  };
}

/**
 * Get the minimum DIP level required for a given feature.
 *
 * @param feature - Feature identifier
 * @returns Minimum DIP level needed (0-4)
 */
export function getRequiredDipLevel(
  feature: "health" | "metrics" | "events" | "config"
): DipLevel {
  const featureLevelMap: Record<string, DipLevel> = {
    health: 1,
    metrics: 2,
    events: 3,
    config: 4,
  };
  return featureLevelMap[feature] ?? 0;
}
