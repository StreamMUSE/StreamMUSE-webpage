-- Keep already-submitted quality-only answers intact; their ranking stays NULL.
-- Current API submissions require a complete ranking. NULL also allows an older
-- deployment to finish an in-flight request during this additive migration.
ALTER TABLE evaluation_quality_responses
  ADD COLUMN ranking jsonb CHECK (evaluation_valid_ranking(ranking));
