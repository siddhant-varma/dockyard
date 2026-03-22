/**
 * MFA settings tab — manage FIDO2 passkeys and TOTP authenticator.
 *
 * NOTE: Full WebAuthn enrollment requires the browser WebAuthn API
 * (navigator.credentials.create / navigator.credentials.get) and a
 * server-side challenge flow via @simplewebauthn/server (pinned to v9.0.3).
 * TOTP enrollment requires generating a shared secret and verifying a code.
 *
 * This tab is scaffolded with the UI structure but the enrollment flows
 * are not yet wired. The Register Passkey and Verify & Enable buttons
 * show a "coming soon" message until the full WebAuthn/TOTP flows are
 * implemented in the auth module.
 *
 * TODO: Wire passkey registration via POST /api/auth/webauthn/register
 * TODO: Wire TOTP enrollment via POST /api/auth/totp/enroll
 * TODO: Fetch existing passkeys from GET /api/auth/webauthn/credentials
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MFATab() {
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [totpMsg, setTotpMsg] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const handleRegisterPasskey = () => {
    // TODO: Full WebAuthn enrollment flow
    // 1. GET /api/auth/webauthn/register/options — get challenge
    // 2. navigator.credentials.create(options) — browser creates credential
    // 3. POST /api/auth/webauthn/register/verify — verify and store
    setRegisterMsg(
      "Passkey registration requires browser WebAuthn support. " +
      "This flow will be wired when the full auth module is connected."
    );
    setTimeout(() => setRegisterMsg(null), 5000);
  };

  const handleVerifyTotp = () => {
    // TODO: Full TOTP enrollment flow
    // 1. POST /api/auth/totp/enroll — get secret + QR code URI
    // 2. User scans QR, enters 6-digit code
    // 3. POST /api/auth/totp/verify — validate code against secret
    if (!totpCode || totpCode.length !== 6) {
      setTotpMsg("Enter a valid 6-digit code.");
      setTimeout(() => setTotpMsg(null), 3000);
      return;
    }
    setTotpMsg(
      "TOTP verification requires the auth enrollment endpoint. " +
      "This flow will be wired when the full auth module is connected."
    );
    setTimeout(() => setTotpMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Passkeys (FIDO2)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleRegisterPasskey}
            >
              + Register Passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground/80">MacBook Pro TouchID</p>
              <p className="text-xs text-foreground/40">Added May 12, 2024</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-400">Remove</Button>
          </div>
          {registerMsg && (
            <p className="text-xs text-yellow-400">{registerMsg}</p>
          )}
          <p className="text-xs text-foreground/30">
            Passkey enrollment requires WebAuthn browser API and is not yet fully wired.
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">TOTP Authenticator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-glass-border bg-white">
            <span className="text-xs text-black/40">QR Code</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="6-digit code"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="w-32 bg-glass-input border-glass-border text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleVerifyTotp}
            >
              Verify & Enable
            </Button>
          </div>
          {totpMsg && (
            <p className="text-xs text-yellow-400">{totpMsg}</p>
          )}
          <p className="text-xs text-foreground/30">
            TOTP enrollment requires a server-generated secret. Not yet fully wired.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
