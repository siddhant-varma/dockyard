# lib/notifications

Multi-channel notification dispatch for DockYard alerts and incidents.

## What it does

Provides a unified `NotificationChannel` interface with four concrete
implementations: email (via Resend), Slack webhooks, Web Push, and generic
outbound webhooks. The alert engine calls `getChannel(type, config)` to obtain
a channel instance and dispatches `NotificationPayload` objects through it.
Channel configuration (webhook URLs, email addresses, push subscriptions) is
stored in the `notification_channels` database table as a JSONB `config` field
and passed at construction time — channels are stateless.

## Key exports (`index.ts`)

| Export | Description |
|--------|-------------|
| `getChannel(type, config)` | Factory — returns a `NotificationChannel` for the given type string |
| `NotificationChannel` | Interface all channel implementations must satisfy |
| `NotificationPayload` | Input type: title, body, severity, projectSlug, url, metadata |
| `SendResult` | Output type: success flag, messageId, error |
| `EmailChannel` | Sends via Resend transactional email API |
| `SlackChannel` | Posts to a Slack incoming webhook URL |
| `PushChannel` | Sends Web Push notifications via the Push API |
| `WebhookChannel` | HTTP POST to an arbitrary URL with optional HMAC signing |

## Severity levels

`NotificationSeverity`: `sev1` (critical) → `sev2` → `sev3` → `sev4` (informational).
Alert rules route to specific channels based on severity.

## Adding a new channel

1. Create a new file, e.g., `src/lib/notifications/pagerduty.ts`.
2. Implement `NotificationChannel` from `types.ts` (provide `type`, `send`,
   and `validate`).
3. Add a `case` for the new type in the `getChannel` factory in `index.ts`.
   No changes are needed in the alert engine or DB layer.

## Environment variables

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key for the Resend email service |
| `NOTIFICATION_FROM_EMAIL` | Sender address for outbound alert emails |
