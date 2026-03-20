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
  it("detects DockYard by CLAUDE.md", () => {
    expect(isDockYard(["CLAUDE.md", "package.json"])).toBe(true);
  });

  it("detects DockYard by src/db/schema.ts", () => {
    expect(isDockYard(["src/db/schema.ts", "package.json"])).toBe(true);
  });

  it("returns false for other projects", () => {
    expect(isDockYard(["package.json", "src/index.ts"])).toBe(false);
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
