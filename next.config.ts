import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  env: {
    NEXT_PUBLIC_AUTH_ENABLED: process.env.DOCKYARD_AUTH_ENABLED ?? "false",
    NEXT_PUBLIC_GITHUB_AUTH_ENABLED: process.env.AUTH_GITHUB_ID
      ? "true"
      : "false",
    NEXT_PUBLIC_SESSION_IDLE_TIMEOUT:
      process.env.DOCKYARD_SESSION_IDLE_TIMEOUT ?? "1800",
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    // HSTS + CSP only in production (when auth/HTTPS is expected).
    // Adding HSTS in local dev would break HTTP-only localhost.
    if (process.env.DOCKYARD_AUTH_ENABLED === "true") {
      securityHeaders.push(
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "worker-src 'self' blob:",
          ].join("; "),
        }
      );
    }

    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
