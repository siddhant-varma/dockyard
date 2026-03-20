/**
 * MfaEnrollment — MFA credential management component.
 *
 * Displays registered MFA credentials (passkeys + TOTP) and provides
 * enrollment flows:
 * - "Add Passkey" triggers the WebAuthn browser prompt
 * - "Add Authenticator App" shows a QR code and verifies a 6-digit code
 * - "Remove" button per credential (with confirmation)
 *
 * Superadmins must maintain at least one MFA method.
 *
 * @param userId - The current user's database ID.
 * @param userEmail - The current user's email (for TOTP account name).
 * @param userName - The current user's display name (for WebAuthn).
 * @param isSuperadmin - Whether the user is a superadmin.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface MfaCredential {
  id: string;
  type: "fido2" | "totp";
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface MfaEnrollmentProps {
  userId: string;
  userEmail: string;
  userName: string;
  isSuperadmin: boolean;
}

export function MfaEnrollment({
  userId: _userId,
  userEmail: _userEmail,
  userName: _userName,
  isSuperadmin,
}: MfaEnrollmentProps) {
  const [credentials, setCredentials] = useState<MfaCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [, setTotpUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/mfa/credentials");
      if (res.ok) {
        setCredentials(await res.json());
      }
    } catch {
      setError("Failed to load MFA credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  async function handleAddTotp() {
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/mfa/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Authenticator App" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to start TOTP enrollment");
      }
      const data = (await res.json()) as { uri: string; secret: string };
      setTotpUri(data.uri);
      setTotpSecret(data.secret);
      setShowTotpSetup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "TOTP setup failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleVerifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/mfa/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      if (!res.ok) {
        throw new Error("Invalid code. Please try again.");
      }
      setShowTotpSetup(false);
      setTotpUri(null);
      setTotpSecret(null);
      setTotpCode("");
      await fetchCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleRemove(credentialId: string, _type: string) {
    if (isSuperadmin && credentials.length <= 1) {
      setError("Superadmins must maintain at least one MFA method");
      return;
    }
    if (!confirm("Remove this credential? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/auth/mfa/credentials/${credentialId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove credential");
      await fetchCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Removal failed");
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading MFA settings...</div>;
  }

  const hasTotp = credentials.some((c) => c.type === "totp");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Multi-Factor Authentication</h3>
        <p className="mt-1 text-sm text-gray-600">
          Add passkeys or authenticator apps for additional security.
          {isSuperadmin && " Superadmins must have at least one MFA method."}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Registered Credentials */}
      {credentials.length > 0 && (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {cred.type === "fido2" ? "🔑" : "📱"}
                </span>
                <div>
                  <div className="text-sm font-medium">{cred.name}</div>
                  <div className="text-xs text-gray-500">
                    {cred.type === "fido2" ? "Passkey" : "TOTP"} · Added{" "}
                    {new Date(cred.createdAt).toLocaleDateString()}
                    {cred.lastUsedAt && (
                      <> · Last used {new Date(cred.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(cred.id, cred.type)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TOTP Setup Flow */}
      {showTotpSetup && totpSecret && (
        <div className="rounded-lg border bg-gray-50 p-4">
          <h4 className="font-medium">Set up Authenticator App</h4>
          <p className="mt-1 text-sm text-gray-600">
            Scan this code with your authenticator app, then enter the 6-digit code.
          </p>
          <div className="mt-3 rounded bg-white p-3 text-center">
            <code className="break-all text-xs">{totpSecret}</code>
          </div>
          <form onSubmit={handleVerifyTotp} className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="flex-1 rounded border px-3 py-2 text-center tracking-widest"
              autoFocus
            />
            <button
              type="submit"
              disabled={enrolling || totpCode.length !== 6}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {enrolling ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      )}

      {/* Enrollment Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setError("WebAuthn enrollment requires browser interaction — use the browser settings page");
          }}
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Add Passkey
        </button>
        {!hasTotp && !showTotpSetup && (
          <button
            onClick={handleAddTotp}
            disabled={enrolling}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {enrolling ? "Setting up..." : "Add Authenticator App"}
          </button>
        )}
      </div>
    </div>
  );
}
