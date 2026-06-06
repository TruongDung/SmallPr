CREATE TABLE IF NOT EXISTS ai_evaluation_runs (
  id SERIAL PRIMARY KEY,
  feature TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_evaluation_runs_feature_created
  ON ai_evaluation_runs (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_evaluation_runs_status
  ON ai_evaluation_runs (status);
