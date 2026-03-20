/**
 * ReAuthModal — just-in-time re-authentication modal for destructive actions.
 *
 * Prompts the user to verify their identity via FIDO2 (tap security key)
 * or TOTP (enter 6-digit code) before a destructive operation can proceed.
 *
 * @param isOpen - Whether the modal is visible.
 * @param onSuccess - Callback fired when re-auth succeeds.
 * @param onCancel - Callback fired when the user dismisses the modal.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface ReAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ReAuthStatus {
  required: boolean;
  methods: string[];
  expiresInSecs: number;
}

export function ReAuthModal({ isOpen, onSuccess, onCancel }: ReAuthModalProps) {
  const [status, setStatus] = useState<ReAuthStatus | null>(null);
  const [method, setMethod] = useState<string>("totp");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const checkStatus = useCallback(async () => {
    const res = await fetch("/api/auth/reauth");
    if (res.ok) {
      const data = (await res.json()) as ReAuthStatus;
      setStatus(data);
      if (!data.required) {
        onSuccess();
      } else if (data.methods.length > 0) {
        setMethod(data.methods[0]);
      }
    }
  }, [onSuccess]);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, checkStatus]);

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode.trim()) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "totp", code: totpCode.trim() }),
      });

      const data = (await res.json()) as { verified: boolean; error?: string };

      if (data.verified) {
        setTotpCode("");
        onSuccess();
      } else {
        setError(data.error ?? "Verification failed");
      }
    } catch {
      setError("Failed to verify");
    } finally {
      setVerifying(false);
    }
  }

  if (!isOpen || !status?.required) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">
          Re-authentication Required
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This action requires you to verify your identity.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status.methods.length > 1 && (
          <div className="mt-4 flex gap-2">
            {status.methods.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded px-3 py-1 text-sm ${
                  method === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {m === "fido2" ? "Security Key" : m === "totp" ? "Authenticator" : "Password"}
              </button>
            ))}
          </div>
        )}

        {method === "totp" && (
          <form onSubmit={handleTotpSubmit} className="mt-4">
            <label
              htmlFor="totp-code"
              className="block text-sm font-medium text-gray-700"
            >
              Enter 6-digit code from your authenticator app
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-2 w-full rounded border px-4 py-2 text-center text-lg tracking-widest"
              autoFocus
            />
            <button
              type="submit"
              disabled={verifying || totpCode.length !== 6}
              className="mt-3 w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        {method === "fido2" && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Tap your security key or use your device biometrics.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              WebAuthn browser prompt will appear automatically.
            </p>
          </div>
        )}

        <button
          onClick={onCancel}
          className="mt-4 w-full rounded border py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
