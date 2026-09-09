CREATE TABLE evaluation_participants (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Existing recordings and responses remain intact. A legacy recovery token may
-- attach its session to a participant when that listener continues the study.
ALTER TABLE evaluation_sessions
  ADD COLUMN participant_id uuid REFERENCES evaluation_participants(id),
  ADD COLUMN round_number integer,
  ADD CONSTRAINT evaluation_session_round_check CHECK (
    (participant_id IS NULL AND round_number IS NULL) OR
    (participant_id IS NOT NULL AND round_number IS NOT NULL AND round_number BETWEEN 1 AND 10)
  );
CREATE UNIQUE INDEX evaluation_participant_song_once
  ON evaluation_sessions (participant_id, song_id) WHERE participant_id IS NOT NULL;
CREATE UNIQUE INDEX evaluation_participant_round_once
  ON evaluation_sessions (participant_id, round_number) WHERE participant_id IS NOT NULL;
