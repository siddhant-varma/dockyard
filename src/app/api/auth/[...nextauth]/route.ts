/**
 * NextAuth API route handler.
 * Handles all auth-related HTTP requests: sign-in, sign-out, callbacks, session.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
