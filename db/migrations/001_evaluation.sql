CREATE FUNCTION evaluation_valid_ratings(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE label text; dimension text; scores jsonb;
BEGIN
  IF jsonb_typeof(value) <> 'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(value)) <> 3 OR NOT value ?& ARRAY['A','B','C'] THEN RETURN false; END IF;
  FOREACH label IN ARRAY ARRAY['A','B','C'] LOOP
    scores := value -> label;
    IF jsonb_typeof(scores) <> 'object' THEN RETURN false; END IF;
    IF (SELECT count(*) FROM jsonb_object_keys(scores)) <> 3 OR NOT scores ?& ARRAY['coherence','plausibility','musicality'] THEN RETURN false; END IF;
    FOREACH dimension IN ARRAY ARRAY['coherence','plausibility','musicality'] LOOP
      IF NOT (scores -> dimension) IN ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END $$;

CREATE FUNCTION evaluation_valid_ranking(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
BEGIN
  IF jsonb_typeof(value) <> 'array' THEN RETURN false; END IF;
  RETURN jsonb_array_length(value) = 3 AND value @> '["A","B","C"]'::jsonb;
END $$;

CREATE TABLE evaluation_sessions (
  id uuid PRIMARY KEY,
  dataset_version text NOT NULL,
  rubric_version text NOT NULL,
  song_id text NOT NULL,
  assignment jsonb NOT NULL CHECK (jsonb_typeof(assignment) = 'object'),
  source_origin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_responses (
  session_id uuid PRIMARY KEY REFERENCES evaluation_sessions(id),
  ratings jsonb NOT NULL CHECK (evaluation_valid_ratings(ratings)),
  ranking jsonb NOT NULL CHECK (evaluation_valid_ranking(ranking)),
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evaluation_responses_submitted_at_idx ON evaluation_responses (submitted_at);
