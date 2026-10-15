export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.GLITCHTIP_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.GLITCHTIP_DSN,
      environment: process.env.NODE_ENV ?? "production",
      tracesSampleRate: 0.01,
    });
  }
}
