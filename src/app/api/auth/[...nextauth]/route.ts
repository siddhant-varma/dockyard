/**
 * NextAuth API route handler.
 *
 * Exports Auth.js GET/POST handlers directly — no wrapper.
 * Wrapping handlers.POST can interfere with cookie setting
 * (Auth.js needs full control of the Response and Set-Cookie headers).
 *
 * Rate limiting for login attempts is handled in the Credentials
 * provider's authorize() function instead.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
