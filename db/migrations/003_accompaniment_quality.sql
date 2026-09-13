-- Add the simplified rubric without rewriting the earlier ratings or rankings.
CREATE FUNCTION evaluation_valid_quality_ratings(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE label text; scores jsonb;
BEGIN
  IF jsonb_typeof(value) <> 'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(value)) <> 3 OR NOT value ?& ARRAY['A','B','C'] THEN RETURN false; END IF;
  FOREACH label IN ARRAY ARRAY['A','B','C'] LOOP
    scores := value -> label;
    IF jsonb_typeof(scores) <> 'object' THEN RETURN false; END IF;
    IF (SELECT count(*) FROM jsonb_object_keys(scores)) <> 1 OR NOT scores ? 'quality' THEN RETURN false; END IF;
    IF NOT (scores -> 'quality') IN ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE TABLE evaluation_quality_responses (
  session_id uuid PRIMARY KEY REFERENCES evaluation_sessions(id),
  ratings jsonb NOT NULL CHECK (evaluation_valid_quality_ratings(ratings)),
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evaluation_quality_responses_submitted_at_idx ON evaluation_quality_responses (submitted_at);
