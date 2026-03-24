import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";

/**
 * POST /api/discovery/test-github
 * Validate a GitHub Personal Access Token by making test API calls.
 * Returns token validity, authenticated user info, and repo accessibility.
 *
 * Body: { token: string, org?: string, user?: string }
 */
export const POST = withAuth(async (request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const token = String(body.token ?? "");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    // Test the token by fetching the authenticated user
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return NextResponse.json({
          valid: false,
          error: "Invalid or expired token",
        });
      }
      return NextResponse.json({
        valid: false,
        error: `GitHub API error: ${userRes.status}`,
      });
    }

    const userData = (await userRes.json()) as {
      login: string;
      name: string | null;
    };

    // If org is specified, check access
    const org = body.org ? String(body.org) : undefined;
    if (org) {
      const orgRes = await fetch(`https://api.github.com/orgs/${org}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!orgRes.ok) {
        return NextResponse.json({
          valid: true,
          warning: `Token is valid (${userData.login}) but cannot access org "${org}"`,
          user: userData.login,
        });
      }
    }

    // Check repo accessibility to give user a preview
    const user = body.user ? String(body.user) : undefined;
    let repoUrl: string;
    if (org) {
      repoUrl = `https://api.github.com/orgs/${org}/repos?per_page=1`;
    } else if (user) {
      repoUrl = `https://api.github.com/users/${user}/repos?per_page=1`;
    } else {
      repoUrl = "https://api.github.com/user/repos?per_page=1";
    }

    const repoRes = await fetch(repoUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(10000),
    });

    const scopes = userRes.headers.get("x-oauth-scopes") ?? "none";

    return NextResponse.json({
      valid: true,
      user: userData.login,
      name: userData.name,
      scopes,
      reposAccessible: repoRes.ok,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ valid: false, error: message });
  }
});
