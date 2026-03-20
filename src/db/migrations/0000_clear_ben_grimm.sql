CREATE TYPE "public"."alert_status" AS ENUM('firing', 'acknowledged', 'resolved', 'auto_resolved');--> statement-breakpoint
CREATE TYPE "public"."component_status" AS ENUM('ok', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."deploy_status" AS ENUM('pending', 'building', 'deploying', 'success', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."discovery_source_type" AS ENUM('filesystem', 'dokploy', 'github', 'manual');--> statement-breakpoint
CREATE TYPE "public"."dokploy_type" AS ENUM('application', 'compose');--> statement-breakpoint
CREATE TYPE "public"."health_status" AS ENUM('healthy', 'degraded', 'down', 'maintenance', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('investigating', 'identified', 'monitoring', 'resolved', 'postmortem');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('email', 'slack', 'push', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."operating_mode" AS ENUM('local', 'vps');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('discovered', 'discovery', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('sev1', 'sev2', 'sev3', 'sev4');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('pending', 'running', 'passed', 'failed', 'error');--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('smoke', 'integration', 'load', 'health_check', 'custom');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('superadmin', 'project_admin', 'viewer');--> statement-breakpoint
CREATE TABLE "ai_context_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"format" text DEFAULT 'json' NOT NULL,
	"validation_hash" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"severity" "severity" NOT NULL,
	"status" "alert_status" DEFAULT 'firing' NOT NULL,
	"message" text,
	"context" jsonb,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"escalation_lvl" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"metric" text NOT NULL,
	"operator" text NOT NULL,
	"threshold" double precision NOT NULL,
	"duration_secs" integer,
	"severity" "severity" NOT NULL,
	"runbook_url" text,
	"notification_channels" text[],
	"enabled" boolean DEFAULT true NOT NULL,
	"cooldown_secs" integer DEFAULT 300 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"server_cost" numeric(10, 2),
	"volume_cost" numeric(10, 2),
	"ip_cost" numeric(10, 2),
	"lb_cost" numeric(10, 2),
	"traffic_cost" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"type" text DEFAULT 'manual' NOT NULL,
	"confidence" numeric(3, 2),
	"snapshot_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_entry_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"old_value_hash" text,
	"new_value_hash" text,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"change_reason" text,
	"rollback_of" uuid
);
--> statement-breakpoint
CREATE TABLE "config_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value_encrypted" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"category" text,
	"display_name" text,
	"description" text,
	"input_type" text DEFAULT 'text' NOT NULL,
	"input_options" jsonb,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" text,
	"commit_sha" text,
	"commit_message" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"status" "deploy_status" DEFAULT 'pending' NOT NULL,
	"triggered_by" text,
	"duration_secs" integer,
	"dokploy_deploy_id" text,
	"deployed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "discovery_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "discovery_source_type" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_scan_at" timestamp with time zone,
	"last_scan_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_check_results" (
	"id" uuid DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"component" text NOT NULL,
	"status" "component_status" NOT NULL,
	"latency_ms" integer,
	"response_code" integer,
	"message" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hetzner_snapshots" (
	"server_id" text NOT NULL,
	"metric_type" text NOT NULL,
	"value" double precision NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"severity" "severity" NOT NULL,
	"status" "incident_status" DEFAULT 'investigating' NOT NULL,
	"timeline" jsonb,
	"related_alerts" uuid[],
	"related_deploys" uuid[],
	"mttr_seconds" integer,
	"postmortem" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "metric_points" (
	"project_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" double precision NOT NULL,
	"labels" jsonb,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"operating_mode" "operating_mode" DEFAULT 'local' NOT NULL,
	"auto_scan" boolean DEFAULT true NOT NULL,
	"scan_interval" integer DEFAULT 300 NOT NULL,
	"settings" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"overall_status" "health_status" DEFAULT 'unknown' NOT NULL,
	"components" jsonb,
	"uptime_30d" numeric(5, 2),
	"last_checked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_health_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'discovered' NOT NULL,
	"current_phase" text,
	"public_visible" boolean DEFAULT false NOT NULL,
	"dokploy_app_id" text,
	"dokploy_type" "dokploy_type",
	"github_repo" text,
	"local_path" text,
	"tech_stack" text[],
	"icon_url" text,
	"discovered_via" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"phase" text,
	"estimated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"sequence_order" integer,
	"blockers" jsonb
);
--> statement-breakpoint
CREATE TABLE "signal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"raw_payload" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slo_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"target_value" double precision NOT NULL,
	"window_days" integer DEFAULT 30 NOT NULL,
	"current_value" double precision,
	"budget_remaining" double precision,
	"burn_rate" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "test_type" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb,
	"schedule_cron" text,
	"run_post_deploy" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "test_type" NOT NULL,
	"status" "test_status" DEFAULT 'pending' NOT NULL,
	"triggered_by" uuid,
	"trigger_reason" text,
	"results" jsonb,
	"duration_secs" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"auth_provider" text,
	"auth_provider_id" text,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_method" text,
	"context_prefs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_context_snapshots" ADD CONSTRAINT "ai_context_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit_log" ADD CONSTRAINT "config_audit_log_config_entry_id_config_entries_id_fk" FOREIGN KEY ("config_entry_id") REFERENCES "public"."config_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit_log" ADD CONSTRAINT "config_audit_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit_log" ADD CONSTRAINT "config_audit_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_entries" ADD CONSTRAINT "config_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_entries" ADD CONSTRAINT "config_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_events" ADD CONSTRAINT "deployment_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_check_results" ADD CONSTRAINT "health_check_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_points" ADD CONSTRAINT "metric_points_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_health" ADD CONSTRAINT "project_health_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slo_budgets" ADD CONSTRAINT "slo_budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_configs" ADD CONSTRAINT "test_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;