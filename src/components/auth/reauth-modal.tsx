/**
 * Re-authentication modal for destructive actions.
 *
 * Prompts the user to confirm their identity before proceeding with
 * dangerous operations (config apply, deployment rollback, project archive).
 *
 * Currently implements a confirmation dialog. When MFA is enrolled, this
 * will be extended to verify via FIDO2 assertion or TOTP code through
 * the POST /api/auth/reauth endpoint.
 *
 * Usage:
 * ```tsx
 * const { requireReAuth } = useReAuth();
 *
 * async function handleDestructiveAction() {
 *   const confirmed = await requireReAuth("Apply config and redeploy?");
 *   if (!confirmed) return;
 *   // proceed with action
 * }
 * ```
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Props for the ReAuthModal component. */
interface ReAuthModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Called when the modal should close (cancel or complete). */
  onOpenChange: (open: boolean) => void;
  /** Description of the action requiring confirmation. */
  actionDescription: string;
  /** Called with true if re-auth succeeds, false if cancelled. */
  onResult: (confirmed: boolean) => void;
}

/**
 * Modal dialog that confirms user intent before destructive actions.
 *
 * In the current implementation, this is a confirmation dialog.
 * When MFA credentials are enrolled, this will be extended to collect
 * a FIDO2 assertion or TOTP code and verify via POST /api/auth/reauth.
 */
export function ReAuthModal({
  open,
  onOpenChange,
  actionDescription,
  onResult,
}: ReAuthModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Check if user has MFA and needs real verification
      const statusRes = await fetch("/api/auth/reauth");
      if (statusRes.ok) {
        const status = (await statusRes.json()) as {
          required: boolean;
          methods: string[];
          expiresInSecs: number;
        };

        // If re-auth is not required (within active window), auto-confirm
        if (!status.required) {
          onResult(true);
          onOpenChange(false);
          return;
        }
      }

      // For now, the confirmation dialog itself acts as the re-auth gate.
      // When full MFA re-auth is wired, this will prompt for FIDO2/TOTP.
      onResult(true);
      onOpenChange(false);
    } catch {
      // If the re-auth check fails, still allow confirmation
      // (the server-side action will enforce auth separately)
      onResult(true);
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    onResult(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>{actionDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-foreground/50">
            This is a destructive action that cannot be easily undone.
            Please confirm you want to proceed.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Confirming..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook that provides a `requireReAuth` function for gating destructive actions.
 *
 * Returns an object with:
 * - `requireReAuth(description)`: async function that shows the modal and
 *   resolves to `true` (confirmed) or `false` (cancelled).
 * - `ReAuthGate`: the modal component to render in the component tree.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { requireReAuth, ReAuthGate } = useReAuth();
 *
 *   async function handleDelete() {
 *     const ok = await requireReAuth("Delete this project permanently?");
 *     if (!ok) return;
 *     await deleteProject();
 *   }
 *
 *   return (
 *     <>
 *       <Button onClick={handleDelete}>Delete</Button>
 *       <ReAuthGate />
 *     </>
 *   );
 * }
 * ```
 */
export function useReAuth() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const requireReAuth = useCallback(
    (actionDescription: string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setDescription(actionDescription);
        setOpen(true);
      });
    },
    []
  );

  const handleResult = useCallback((confirmed: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(confirmed);
      resolveRef.current = null;
    }
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const ReAuthGate = useCallback(
    () => (
      <ReAuthModal
        open={open}
        onOpenChange={handleOpenChange}
        actionDescription={description}
        onResult={handleResult}
      />
    ),
    [open, handleOpenChange, description, handleResult]
  );

  return { requireReAuth, ReAuthGate };
}
