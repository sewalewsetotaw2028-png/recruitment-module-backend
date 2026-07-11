-- Promote interview evaluations to the template-driven scoring model.
ALTER TABLE "interview_evaluation"
  ADD COLUMN IF NOT EXISTS "evaluation_template_id" TEXT,
  ADD COLUMN IF NOT EXISTS "scores_json" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'interview_evaluation'
      AND column_name = 'technical_score'
  ) THEN
    -- Map the legacy fixed columns into the new JSON array before removing them.
    UPDATE "interview_evaluation"
    SET "scores_json" = jsonb_build_array(
      jsonb_build_object(
        'criteria_name', 'Technical',
        'score', COALESCE("technical_score", 0)
      ),
      jsonb_build_object(
        'criteria_name', 'Behavioral',
        'score', COALESCE("behavioral_score", 0)
      ),
      jsonb_build_object(
        'criteria_name', 'Experience',
        'score', COALESCE("experience_score", 0)
      )
    );
  END IF;
END $$;

ALTER TABLE "interview_evaluation"
  DROP COLUMN IF EXISTS "technical_score",
  DROP COLUMN IF EXISTS "behavioral_score",
  DROP COLUMN IF EXISTS "experience_score";
