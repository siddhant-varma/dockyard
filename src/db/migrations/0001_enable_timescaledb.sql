-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert time-series tables to hypertables for efficient time-series storage.
-- These tables store high-volume, time-ordered data from health checks,
-- application metrics, and Hetzner server metrics.
--
-- TimescaleDB automatically partitions data by time (default: 7 days per chunk),
-- enabling efficient queries, compression, and retention policies.

SELECT create_hypertable('health_check_results', 'checked_at', if_not_exists => TRUE);
SELECT create_hypertable('metric_points', 'recorded_at', if_not_exists => TRUE);
SELECT create_hypertable('hetzner_snapshots', 'recorded_at', if_not_exists => TRUE);

-- Enable compression on hypertables (data older than 7 days gets compressed)
ALTER TABLE health_check_results SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id,component'
);
SELECT add_compression_policy('health_check_results', INTERVAL '7 days', if_not_exists => TRUE);

ALTER TABLE metric_points SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id,metric_name'
);
SELECT add_compression_policy('metric_points', INTERVAL '7 days', if_not_exists => TRUE);

ALTER TABLE hetzner_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'server_id,metric_type'
);
SELECT add_compression_policy('hetzner_snapshots', INTERVAL '7 days', if_not_exists => TRUE);

-- Retention policies (drop raw data after configured retention period)
SELECT add_retention_policy('health_check_results', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('metric_points', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('hetzner_snapshots', INTERVAL '180 days', if_not_exists => TRUE);
