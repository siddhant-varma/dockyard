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

/** Files that suggest this directory is DockYard itself (skip during scan). */
const SELF_INDICATORS = ["src/db/schema.ts", "CLAUDE.md"] as const;

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
 * @param files - Filenames present in the directory (can include relative paths)
 * @returns true if this is likely the DockYard installation directory
 */
export function isDockYard(files: string[]): boolean {
  return (SELF_INDICATORS as readonly string[]).some((indicator) =>
    files.includes(indicator)
  );
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
