import { describe, it, expect } from "vitest";
import {
  isProject,
  isDockYard,
  inferTechStack,
  generateSlug,
} from "@/lib/discovery/indicators";

describe("isProject", () => {
  it("returns true for directories with package.json", () => {
    expect(isProject(["package.json", "README.md"])).toBe(true);
  });

  it("returns true for directories with go.mod", () => {
    expect(isProject(["go.mod", "main.go"])).toBe(true);
  });

  it("returns true for directories with Dockerfile", () => {
    expect(isProject(["Dockerfile", "app.py"])).toBe(true);
  });

  it("returns false for directories with no indicators", () => {
    expect(isProject(["notes.txt", "README.md"])).toBe(false);
  });

  it("returns false for empty directories", () => {
    expect(isProject([])).toBe(false);
  });
});

describe("isDockYard", () => {
  it("returns true when both required and confirming markers are present", () => {
    expect(
      isDockYard(["src/db/schema.ts", "DOCKYARD-JSON.md", "package.json"])
    ).toBe(true);
  });

  it("returns true with .dockyard-self sentinel as confirming marker", () => {
    expect(
      isDockYard(["src/db/schema.ts", ".dockyard-self", "package.json"])
    ).toBe(true);
  });

  it("returns true when both confirming markers are present", () => {
    expect(
      isDockYard([
        "src/db/schema.ts",
        "DOCKYARD-JSON.md",
        ".dockyard-self",
        "package.json",
      ])
    ).toBe(true);
  });

  it("returns false for directories with only CLAUDE.md (Claude Code projects)", () => {
    expect(isDockYard(["CLAUDE.md", "package.json"])).toBe(false);
  });

  it("returns false for directories with only src/db/schema.ts (Drizzle projects)", () => {
    expect(isDockYard(["src/db/schema.ts", "package.json"])).toBe(false);
  });

  it("returns false for directories with only package.json", () => {
    expect(isDockYard(["package.json", "src/index.ts"])).toBe(false);
  });

  it("returns false for empty file lists", () => {
    expect(isDockYard([])).toBe(false);
  });

  it("returns false when confirming marker is present but required is missing", () => {
    expect(isDockYard(["DOCKYARD-JSON.md", "package.json"])).toBe(false);
  });

  it("returns false for directories with CLAUDE.md and src/db/schema.ts but no confirming marker", () => {
    expect(
      isDockYard(["CLAUDE.md", "src/db/schema.ts", "package.json"])
    ).toBe(false);
  });
});

describe("inferTechStack", () => {
  it("infers node from package.json", () => {
    expect(inferTechStack(["package.json"])).toEqual(["node"]);
  });

  it("infers multiple tags from multiple indicators", () => {
    const result = inferTechStack(["package.json", "Dockerfile"]);
    expect(result).toContain("node");
    expect(result).toContain("docker");
  });

  it("returns empty array for no matches", () => {
    expect(inferTechStack(["README.md"])).toEqual([]);
  });

  it("infers rust from Cargo.toml", () => {
    expect(inferTechStack(["Cargo.toml"])).toEqual(["rust"]);
  });
});

describe("generateSlug", () => {
  it("converts to lowercase", () => {
    expect(generateSlug("MyProject")).toBe("myproject");
  });

  it("replaces spaces and special chars with hyphens", () => {
    expect(generateSlug("My Cool Project")).toBe("my-cool-project");
  });

  it("strips leading/trailing hyphens", () => {
    expect(generateSlug("-project-")).toBe("project");
  });

  it("handles already-slugified names", () => {
    expect(generateSlug("api-gateway")).toBe("api-gateway");
  });
});
