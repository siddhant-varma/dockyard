/**
 * MFA settings tab — manage FIDO2 passkeys and TOTP authenticator.
 *
 * Fetches existing credentials from GET /api/auth/mfa and renders
 * passkey list + TOTP enrollment sections.
 *
 * Passkey registration flow:
 * 1. POST /api/auth/mfa/webauthn to get registration options (challenge)
 * 2. Call navigator.credentials.create() via @simplewebauthn/browser
 * 3. PUT /api/auth/mfa/webauthn with the attestation response
 *
 * TOTP enrollment flow:
 * 1. POST /api/auth/mfa/totp to get secret + QR URI
 * 2. User scans QR code with authenticator app
 * 3. PUT /api/auth/mfa/totp with the 6-digit code to verify + activate
 *
 * Note: @simplewebauthn/browser is loaded via dynamic import. If not
 * installed, the passkey registration gracefully falls back with a message.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Shape of a credential returned by GET /api/auth/mfa */
interface MfaCredential {
  id: string;
  type: "fido2" | "totp";
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** TOTP enrollment state */
interface TotpEnrollment {
  credentialId: string;
  uri: string;
  secret: string;
}

export function MFATab() {
  const [credentials, setCredentials] = useState<MfaCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState(false);
  const [totpMsg, setTotpMsg] = useState<string | null>(null);
  const [totpError, setTotpError] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(
    null
  );
  const [enrollingTotp, setEnrollingTotp] = useState(false);
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  const passkeys = credentials.filter((c) => c.type === "fido2");
  const hasTotp = credentials.some((c) => c.type === "totp");

  /** Fetch credentials from the API. */
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/mfa");
      if (!res.ok) return;
      const json = (await res.json()) as { data: MfaCredential[] };
      setCredentials(json.data ?? []);
    } catch {
      // Silently fail — credentials list shows empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  /** Format a date string for display. */
  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Register a new passkey via the WebAuthn flow.
   * Uses dynamic import for @simplewebauthn/browser since it may not be installed.
   */
  const handleRegisterPasskey = async () => {
    setRegisterMsg(null);
    setRegisterError(false);
    setRegisteringPasskey(true);

    try {
      // Step 1: Get registration options from server
      const optionsRes = await fetch("/api/auth/mfa/webauthn", {
        method: "POST",
      });
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ??
            `Failed to get registration options (${optionsRes.status})`
        );
      }
      const { data: options } = (await optionsRes.json()) as {
        data: Record<string, unknown>;
      };

      // Step 2: Create credential via browser WebAuthn API
      // Dynamic import — @simplewebauthn/browser may not be installed.
      // Uses string variable to prevent TypeScript from statically resolving the module.
      let attestation: unknown;
      try {
        const modulePath = "@simplewebauthn/browser";
        const webauthnBrowser = (await import(
          /* webpackIgnore: true */ modulePath
        )) as {
          startRegistration: (
            opts: Record<string, unknown>
          ) => Promise<unknown>;
        };
        attestation = await webauthnBrowser.startRegistration(options);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "WebAuthn not available";
        // Check if it's a module-not-found error vs a user cancellation
        if (
          message.includes("Cannot find module") ||
          message.includes("MODULE_NOT_FOUND")
        ) {
          throw new Error(
            "Passkey registration requires @simplewebauthn/browser. " +
              "Install it with: npm install @simplewebauthn/browser"
          );
        }
        throw new Error(`Passkey registration failed: ${message}`);
      }

      // Step 3: Send attestation to server for verification
      const credentialName = prompt("Name this passkey (e.g., MacBook TouchID):");
      const verifyRes = await fetch("/api/auth/mfa/webauthn", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: (options as { challenge?: string }).challenge,
          attestation,
          name: credentialName ?? "Passkey",
        }),
      });

      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ??
            `Registration verification failed (${verifyRes.status})`
        );
      }

      setRegisterMsg("Passkey registered successfully.");
      setRegisterError(false);
      await fetchCredentials();
    } catch (err) {
      setRegisterMsg(
        err instanceof Error ? err.message : "Passkey registration failed."
      );
      setRegisterError(true);
    } finally {
      setRegisteringPasskey(false);
      setTimeout(() => setRegisterMsg(null), 8000);
    }
  };

  /**
   * Start TOTP enrollment — get a secret + QR URI from the server.
   */
  const handleEnrollTotp = async () => {
    setTotpMsg(null);
    setTotpError(false);
    setEnrollingTotp(true);

    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Authenticator App" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ??
            `Failed to generate TOTP secret (${res.status})`
        );
      }

      const { data } = (await res.json()) as { data: TotpEnrollment };
      setTotpEnrollment(data);
    } catch (err) {
      setTotpMsg(
        err instanceof Error ? err.message : "Failed to start TOTP enrollment."
      );
      setTotpError(true);
      setTimeout(() => setTotpMsg(null), 5000);
    } finally {
      setEnrollingTotp(false);
    }
  };

  /**
   * Verify a TOTP code and activate MFA.
   */
  const handleVerifyTotp = async () => {
    setTotpMsg(null);
    setTotpError(false);

    if (!totpCode || totpCode.length !== 6) {
      setTotpMsg("Enter a valid 6-digit code.");
      setTotpError(true);
      setTimeout(() => setTotpMsg(null), 3000);
      return;
    }

    setVerifyingTotp(true);

    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } }).error?.message ??
            `Verification failed (${res.status})`
        );
      }

      setTotpMsg("TOTP authenticator activated successfully.");
      setTotpError(false);
      setTotpEnrollment(null);
      setTotpCode("");
      await fetchCredentials();
    } catch (err) {
      setTotpMsg(
        err instanceof Error ? err.message : "TOTP verification failed."
      );
      setTotpError(true);
    } finally {
      setVerifyingTotp(false);
      setTimeout(() => setTotpMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Passkeys (FIDO2) */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Passkeys (FIDO2)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleRegisterPasskey}
              disabled={registeringPasskey}
            >
              {registeringPasskey ? "Registering..." : "+ Register Passkey"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-xs text-foreground/40">Loading credentials...</p>
          ) : passkeys.length === 0 ? (
            <p className="text-xs text-foreground/40">
              No passkeys registered. Click &quot;Register Passkey&quot; to add one.
            </p>
          ) : (
            passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground/80">
                    {pk.name}
                  </p>
                  <p className="text-xs text-foreground/40">
                    Added {formatDate(pk.createdAt)}
                    {pk.lastUsedAt && ` — Last used ${formatDate(pk.lastUsedAt)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
          {registerMsg && (
            <p
              className={`text-xs ${registerError ? "text-red-400" : "text-emerald-400"}`}
            >
              {registerMsg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* TOTP Authenticator */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">TOTP Authenticator</CardTitle>
            {!hasTotp && !totpEnrollment && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleEnrollTotp}
                disabled={enrollingTotp}
              >
                {enrollingTotp ? "Generating..." : "Setup Authenticator"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasTotp ? (
            <div className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground/80">
                  {credentials.find((c) => c.type === "totp")?.name ??
                    "Authenticator App"}
                </p>
                <p className="text-xs text-emerald-400">Active</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-400"
              >
                Remove
              </Button>
            </div>
          ) : totpEnrollment ? (
            <>
              <div className="space-y-2">
                <p className="text-xs text-foreground/60">
                  Scan this QR code with your authenticator app, then enter the
                  6-digit code below to verify.
                </p>
                {/* QR code rendering — uses the otpauth:// URI */}
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-glass-border bg-white">
                  {/*
                    In production, render a QR code from totpEnrollment.uri
                    using a library like qrcode.react or @zxing/browser.
                    For now, show the URI as fallback text.
                  */}
                  <span className="break-all p-1 text-center text-[8px] text-black/60">
                    QR: {totpEnrollment.uri.slice(0, 40)}...
                  </span>
                </div>
                <div className="rounded-lg border border-glass-border bg-card/50 p-2">
                  <p className="text-xs text-foreground/40">
                    Manual entry key:
                  </p>
                  <p className="font-mono text-xs text-foreground/70 select-all">
                    {totpEnrollment.secret}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="6-digit code"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-32 bg-glass-input border-glass-border text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleVerifyTotp}
                  disabled={verifyingTotp}
                >
                  {verifyingTotp ? "Verifying..." : "Verify & Enable"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-foreground/40">
              No authenticator app configured. Click &quot;Setup Authenticator&quot;
              to generate a TOTP secret.
            </p>
          )}
          {totpMsg && (
            <p
              className={`text-xs ${totpError ? "text-red-400" : "text-emerald-400"}`}
            >
              {totpMsg}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
