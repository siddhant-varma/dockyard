/**
 * Session timeout provider — client-side idle detection and auto-logout.
 *
 * Wraps the application with idle detection using `react-idle-timer`.
 * When the user is inactive for the configured timeout period (default 30 min),
 * the session is automatically terminated and the user is redirected to the
 * login page. A warning modal appears 5 minutes before timeout.
 *
 * Features:
 * - **Idle detection**: Mouse, keyboard, touch, scroll, visibility changes
 * - **Cross-tab sync**: Activity in one tab resets the timer in all tabs
 * - **Web Worker timer**: Avoids browser background tab throttling
 * - **Warning modal**: 5-minute countdown before auto-logout
 * - **Conditional activation**: Only active when auth is enabled and user
 *   is authenticated. Renders as a passthrough otherwise.
 *
 * Configuration via environment variable:
 * - `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT`: Idle timeout in seconds (default: 1800)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useIdleTimer } from "react-idle-timer";
import { SessionTimeoutModal } from "./session-timeout-modal";

/** Duration of the warning phase before auto-logout, in milliseconds. */
const PROMPT_BEFORE_IDLE_MS = 5 * 60 * 1000; // 5 minutes

/** Whether the auth system is active. */
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

/**
 * Read the idle timeout from the client-side env var.
 * Falls back to 1800 seconds (30 minutes) if not set.
 */
function getIdleTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT;
  const seconds = raw ? parseInt(raw, 10) : 1800;
  return (isNaN(seconds) ? 1800 : seconds) * 1000;
}

/**
 * Provider component that monitors user activity and enforces idle timeout.
 *
 * Wrap this around your application content (inside `SessionProvider`).
 * When the user is idle for the configured duration, they are automatically
 * signed out and redirected to `/login?reason=timeout`.
 *
 * When auth is disabled or the user is not authenticated, this component
 * renders children without any idle tracking.
 */
export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Skip idle tracking when auth is disabled or user is not authenticated
  const isActive = AUTH_ENABLED && status === "authenticated";

  const idleTimeoutMs = getIdleTimeoutMs();

  const handleAutoLogout = useCallback(async () => {
    // Clear any running countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setShowModal(false);
    await signOut({ callbackUrl: "/login?reason=timeout" });
  }, []);

  const { activate, getRemainingTime } = useIdleTimer({
    timeout: idleTimeoutMs,
    promptBeforeIdle: PROMPT_BEFORE_IDLE_MS,
    crossTab: true,
    syncTimers: 200,
    disabled: !isActive,
    onPrompt: () => {
      // Enter warning phase — show modal and start countdown
      setShowModal(true);
      setRemaining(Math.ceil(getRemainingTime() / 1000));

      // Update countdown every second
      countdownRef.current = setInterval(() => {
        const secs = Math.ceil(getRemainingTime() / 1000);
        setRemaining(secs);
      }, 1000);
    },
    onIdle: () => {
      handleAutoLogout();
    },
    onActive: () => {
      // User became active after the prompt — dismiss modal
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setShowModal(false);
    },
  });

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleContinue = useCallback(() => {
    // Reset the idle timer and dismiss the modal
    activate();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setShowModal(false);

    // Ping the server to refresh the session cookie
    fetch("/api/auth/session").catch(() => {});
  }, [activate]);

  return (
    <>
      {children}
      {isActive && (
        <SessionTimeoutModal
          open={showModal}
          remainingSeconds={remaining}
          onContinue={handleContinue}
        />
      )}
    </>
  );
}
