/**
 * MFA verification page — /login/verify
 *
 * Shown after successful credentials login when 2FA is enforced.
 * User enters their 6-digit TOTP code. On success, the mfaPending
 * flag is cleared from the JWT and they're redirected to the dashboard.
 */

"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/api/auth-fetch";

export default function MfaVerifyPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code || code.length !== 6) {
      setError("Enter a valid 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof (body as Record<string, unknown>).error === "string"
            ? (body as Record<string, unknown>).error
            : ((body as { error?: { message?: string } }).error?.message ??
              "Verification failed");
        setError(msg as string);
        return;
      }

      // MFA verified — redirect to destination
      window.location.href = callbackUrl;
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-glass-border bg-card/80 p-8 shadow-lg backdrop-blur-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            DockYard
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Two-factor authentication
          </p>
        </div>

        <p className="mb-4 text-xs text-foreground/60">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full rounded-lg border border-glass-border bg-glass-input px-3 py-2.5 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-foreground/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={submitting}
            autoFocus
          />

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
