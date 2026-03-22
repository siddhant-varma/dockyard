/**
 * GitHub discovery source.
 *
 * Discovers projects by listing repositories from a connected
 * GitHub user account or organization.
 *
 * Configuration (from discovery_sources.config JSONB):
 *   { org?: string, user?: string, token: string }
 *
 * - `org`: GitHub organization name (lists org repos)
 * - `user`: GitHub username (lists user repos). If neither org nor user
 *   is set, lists repos for the authenticated user.
 * - `token`: GitHub personal access token (required)
 */

import type { DiscoveredProject, DiscoverySource } from "../types";
import { generateSlug } from "../indicators";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("discovery.github");

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  fork: boolean;
  archived: boolean;
  html_url: string;
  default_branch: string;
}

export class GitHubSource implements DiscoverySource {
  readonly type = "github" as const;

  async scan(config: Record<string, unknown>): Promise<DiscoveredProject[]> {
    const token = String(config.token ?? "");
    if (!token) {
      log.warn("No GitHub token provided — skipping GitHub discovery");
      return [];
    }

    const org = config.org ? String(config.org) : undefined;
    const user = config.user ? String(config.user) : undefined;

    log.info(
      { org: org ?? "(none)", user: user ?? "(none)", tokenLength: token.length },
      "GitHub scan starting"
    );

    const repos = await this.fetchRepos(token, org, user);
    const filtered = repos.filter((repo) => !repo.fork && !repo.archived);

    log.info(
      {
        totalRepos: repos.length,
        afterFilter: filtered.length,
        forksSkipped: repos.filter((r) => r.fork).length,
        archivedSkipped: repos.filter((r) => r.archived).length,
      },
      "GitHub scan completed"
    );

    return filtered
      .map((repo) => ({
        name: repo.name,
        slug: generateSlug(repo.name),
        description: repo.description ?? undefined,
        githubRepo: repo.full_name,
        techStack: repo.language ? [repo.language.toLowerCase()] : undefined,
        source: "github" as const,
        metadata: {
          defaultBranch: repo.default_branch,
          htmlUrl: repo.html_url,
        },
      }));
  }

  private async fetchRepos(
    token: string,
    org?: string,
    user?: string
  ): Promise<GitHubRepo[]> {
    const allRepos: GitHubRepo[] = [];
    let url: string;

    if (org) {
      url = `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated`;
    } else if (user) {
      url = `https://api.github.com/users/${user}/repos?per_page=100&sort=updated`;
    } else {
      url = "https://api.github.com/user/repos?per_page=100&sort=updated";
    }

    try {
      // Paginate (GitHub defaults to 30, max 100 per page)
      let nextUrl: string | null = url;
      let page = 1;
      while (nextUrl) {
        log.debug({ url: nextUrl, page }, "Fetching GitHub repos page");
        const response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          log.error(
            { status: response.status, statusText: response.statusText, url: nextUrl },
            "GitHub API returned error"
          );
          break;
        }

        const rateRemaining = response.headers.get("x-ratelimit-remaining");
        if (rateRemaining && parseInt(rateRemaining) < 100) {
          log.warn(
            { remaining: rateRemaining },
            "GitHub API rate limit approaching"
          );
        }

        const repos = (await response.json()) as GitHubRepo[];
        allRepos.push(...repos);
        log.debug({ page, reposOnPage: repos.length, totalSoFar: allRepos.length }, "GitHub page fetched");

        // Parse Link header for pagination
        nextUrl = this.getNextPageUrl(response.headers.get("link"));
        page++;
      }
    } catch (err) {
      log.error({ err, fetchedSoFar: allRepos.length }, "GitHub API request failed — returning partial results");
    }

    return allRepos;
  }

  private getNextPageUrl(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match?.[1] ?? null;
  }
}
