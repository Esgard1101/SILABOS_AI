-- Async AI generation jobs
-- Stores long-running IA requests so the frontend can use job_id + polling.

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_type VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'done', 'error')),
    unit_number INT,
    request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_json JSONB,
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_user_active
ON ai_generation_jobs(user_id, status, created_at DESC)
WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_syllabus
ON ai_generation_jobs(syllabus_id, created_at DESC);

ALTER TABLE ai_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_generation_jobs_owner_select ON ai_generation_jobs;
CREATE POLICY ai_generation_jobs_owner_select
ON ai_generation_jobs
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
);
