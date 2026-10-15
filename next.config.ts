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

    // HSTS is ignored by browsers over plain HTTP, so it is safe on localhost.
    // 'unsafe-eval' is only needed by Next.js dev mode (React Refresh).
    const devEval =
      process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
    securityHeaders.push(
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline'${devEval}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
        ].join("; "),
      }
    );

    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
