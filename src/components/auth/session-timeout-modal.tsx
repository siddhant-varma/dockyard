/**
 * Session timeout warning modal.
 *
 * Displays a countdown timer before the session expires due to inactivity.
 * The user can extend their session by clicking "Continue Session" or
 * explicitly log out. Uses `aria-live` for screen reader accessibility.
 *
 * This modal is controlled by the `SessionTimeoutProvider` and should
 * not be used directly — it renders automatically when the idle timer
 * enters its prompt phase.
 */

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Props for the SessionTimeoutModal component. */
interface SessionTimeoutModalProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Remaining seconds until auto-logout. */
  remainingSeconds: number;
  /** Called when the user clicks "Continue Session". */
  onContinue: () => void;
}

/**
 * Format seconds into "M:SS" display string.
 * @param seconds - Total remaining seconds
 * @returns Formatted string like "4:30" or "0:15"
 */
function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Warning modal shown before automatic session logout.
 *
 * Displays when the idle timer's prompt phase begins (default: 5 minutes
 * before timeout). Shows a countdown and allows the user to extend their
 * session or log out immediately.
 */
export function SessionTimeoutModal({
  open,
  remainingSeconds,
  onContinue,
}: SessionTimeoutModalProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login?reason=timeout" });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="mb-3 text-4xl font-mono font-bold tracking-wider text-foreground"
          >
            {formatCountdown(Math.max(0, remainingSeconds))}
          </div>
          <p className="text-xs text-foreground/50">
            Click &quot;Continue Session&quot; to stay signed in, or you will be
            logged out automatically.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Log Out"}
          </Button>
          <Button size="sm" onClick={onContinue}>
            Continue Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
