/**
 * Project indicator detection utilities.
 *
 * Determines whether a directory is a software project and infers
 * its type and tech stack from the presence of specific files.
 */

/** Files whose presence indicates a directory is a software project. */
const PROJECT_INDICATORS = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "mix.exs",
  "pubspec.yaml",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
] as const;

/**
 * Files that MUST be present for a directory to be considered DockYard itself.
 * `src/db/schema.ts` is common in Drizzle projects, so it alone is not sufficient.
 */
const SELF_REQUIRED = ["src/db/schema.ts"] as const;

/**
 * At least one of these confirming markers must also be present.
 * `DOCKYARD-JSON.md` is the DockYard schema reference doc.
 * `.dockyard-self` is an explicit sentinel file for self-detection.
 */
const SELF_CONFIRMING = ["DOCKYARD-JSON.md", ".dockyard-self"] as const;

/**
 * Mapping from indicator file to inferred tech stack tags.
 * A single project may match multiple entries.
 */
const TECH_STACK_MAP: Record<string, string[]> = {
  "package.json": ["node"],
  "Cargo.toml": ["rust"],
  "pyproject.toml": ["python"],
  "go.mod": ["go"],
  "composer.json": ["php"],
  Gemfile: ["ruby"],
  "pom.xml": ["java"],
  "build.gradle": ["java", "kotlin"],
  "mix.exs": ["elixir"],
  "pubspec.yaml": ["dart", "flutter"],
  Dockerfile: ["docker"],
  "docker-compose.yml": ["docker"],
  "docker-compose.yaml": ["docker"],
};

/**
 * Check if a list of filenames contains any project indicators.
 *
 * @param files - Filenames present in the directory (not full paths)
 * @returns true if the directory is likely a software project
 */
export function isProject(files: string[]): boolean {
  return files.some((f) =>
    (PROJECT_INDICATORS as readonly string[]).includes(f)
  );
}

/**
 * Check if a directory appears to be DockYard itself.
 *
 * Returns true only when ALL required markers AND at least one confirming
 * marker are present. This prevents false positives for Drizzle projects
 * (which have `src/db/schema.ts`) and Claude Code projects (which have `CLAUDE.md`).
 *
 * @param files - Filenames present in the directory (can include relative paths)
 * @returns true if this is likely the DockYard installation directory
 */
export function isDockYard(files: string[]): boolean {
  const hasRequired = (SELF_REQUIRED as readonly string[]).every((f) =>
    files.includes(f)
  );
  const hasConfirming = (SELF_CONFIRMING as readonly string[]).some((f) =>
    files.includes(f)
  );
  return hasRequired && hasConfirming;
}

/**
 * Infer tech stack tags from the files present in a directory.
 *
 * @param files - Filenames present in the directory
 * @returns Deduplicated array of tech stack tags
 */
export function inferTechStack(files: string[]): string[] {
  const tags = new Set<string>();
  for (const file of files) {
    const mapped = TECH_STACK_MAP[file];
    if (mapped) {
      for (const tag of mapped) {
        tags.add(tag);
      }
    }
  }
  return [...tags];
}

/**
 * Generate a URL-safe slug from a project directory name.
 *
 * @param name - Directory name or project name
 * @returns Lowercase, hyphenated slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
