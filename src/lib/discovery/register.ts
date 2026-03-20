/**
 * Registers all discovery source implementations with the scanner.
 * Call this once at startup (API routes, Inngest functions).
 */

import { registerSource } from "./scanner";
import { FilesystemSource } from "./sources/filesystem";
import { DokploySource } from "./sources/dokploy";
import { GitHubSource } from "./sources/github";
import { ManualSource } from "./sources/manual";

let registered = false;

export function registerAllSources(): void {
  if (registered) return;
  registerSource(new FilesystemSource());
  registerSource(new DokploySource());
  registerSource(new GitHubSource());
  registerSource(new ManualSource());
  registered = true;
}
