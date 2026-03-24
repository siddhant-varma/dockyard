# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-19

### Added

- **Project Discovery**: Pluggable discovery engine with filesystem, Dokploy, GitHub, and manual sources
- **Watchtower Health Monitoring**: Health check poller, status dashboard, per-project health detail
- **Config Management**: Environment variable editor with encryption at rest, templates, rollback, and Dokploy sync
- **Alert Engine**: Rule builder, multi-window evaluation, deduplication, grouping, escalation, and burn-rate alerts
- **Incident Management**: Incident lifecycle (open/acknowledged/resolved), timeline, and postmortem sections
- **DORA Metrics**: Deployment frequency, lead time, change failure rate, and MTTR tracking
- **MFA Authentication**: OAuth2 SSO (GitHub/Google) with FIDO2 WebAuthn and TOTP second factors
- **SLO Budgets**: SLO definitions with error budget tracking and burn-rate alerting
- **AI Insights**: Velocity scoring, confidence assessment, project summaries, and context handoff
- **Real-Time Updates**: SSE-based live dashboard with health, deploy status, and alert streams
- **Structured Logging**: Pino-based JSON logging with context propagation and sampling
- **Comprehensive Test Suite**: 181 Vitest unit/integration tests and Playwright E2E tests
- **CI Pipeline**: GitHub Actions with static analysis, build, unit tests, and E2E tests
