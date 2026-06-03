CREATE INDEX IF NOT EXISTS audit_logs_search_idx
ON audit_logs USING GIN (to_tsvector('simple',
  COALESCE(action, '') || ' ' ||
  COALESCE(entity_type, '') || ' ' ||
  COALESCE(entity_id::text, '') || ' ' ||
  COALESCE(summary, '') || ' ' ||
  COALESCE(before_data::text, '') || ' ' ||
  COALESCE(after_data::text, '')
));
