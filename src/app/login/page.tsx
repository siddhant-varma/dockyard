/**
 * Login page — /login
 *
 * Minimal glass-card form for admin credentials login.
 * Shows GitHub OAuth button only when AUTH_GITHUB_ID is configured.
 * Redirects authenticated users to the home page.
 */

"use client";

import { useState, useEffect, type FormEvent } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect authenticated users away from login
  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = callbackUrl;
    }
  }, [status, callbackUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid credentials. Check your email and password.");
      } else if (result?.ok) {
        // Hard navigation — forces full server re-render with new session cookie.
        // router.replace() does a soft navigation that uses cached RSC payload
        // from the unauthenticated state, causing pages to show "Loading" forever.
        window.location.href = callbackUrl;
        return; // Keep submitting=true while navigating
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Don't render form while checking session
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-foreground/40">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-glass-border bg-card/80 p-8 shadow-lg backdrop-blur-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            DockYard
          </h1>
          <p className="mt-1 text-sm text-foreground/50">Sign in to continue</p>
        </div>

        {/* Session expiry / revocation notice */}
        {reason === "timeout" && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-amber-400">
              Your session expired due to inactivity. Please sign in again.
            </p>
          </div>
        )}
        {reason === "revoked" && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
            <p className="text-xs text-red-400">
              Your session was revoked by an administrator. Please sign in
              again.
            </p>
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-foreground/60"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-glass-border bg-glass-input px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="admin"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-foreground/60"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-glass-border bg-glass-input px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Password"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* GitHub OAuth — only shown when configured */}
        {process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === "true" && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-glass-border" />
              <span className="text-xs text-foreground/30">or</span>
              <div className="h-px flex-1 bg-glass-border" />
            </div>

            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-glass-input"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </>
        )}
      </div>
    </div>
  );
}
