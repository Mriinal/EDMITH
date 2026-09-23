-- ============================================================================
-- EDMITH COMPLETE EDUCATIONAL ASSESSMENT SCHEMA MIGRATION
-- Run this complete script in the Supabase SQL Editor.
-- Non-destructive, additive, idempotent with Row Level Security (RLS) & Leaderboard View.
-- ============================================================================

-- ==============================================================================
-- 1. PUBLIC.USERS TABLE: IDENTITY, PROFILE, RLS, PERMISSIONS & SYNC TRIGGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    user_id             SERIAL          PRIMARY KEY,
    auth_user_id        UUID            UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name          VARCHAR(50)     NOT NULL,
    last_name           VARCHAR(50),
    username            VARCHAR(30)     UNIQUE NOT NULL
                            CONSTRAINT chk_username_format
                            CHECK (
                                username ~ '^[a-zA-Z0-9._-]{3,30}$'
                                AND username NOT LIKE '% %'
                            ),
    email               VARCHAR(100)    UNIQUE NOT NULL,
    phone               VARCHAR(20),
    country             VARCHAR(60)     NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL DEFAULT 'supabase_managed',
    is_email_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
    verification_token  VARCHAR(255),
    token_expires_at    TIMESTAMP,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    learning_goal       TEXT,
    referral_source     VARCHAR(30),
    referral_other      VARCHAR(100),
    agreed_terms        BOOLEAN         NOT NULL DEFAULT TRUE,
    agreed_privacy      BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_login          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist if the table was created previously
DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country VARCHAR(60);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT 'supabase_managed';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS learning_goal TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(30);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_other VARCHAR(100);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agreed_privacy BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Ensure password_hash and agreed fields have non-blocking defaults
    ALTER TABLE public.users ALTER COLUMN password_hash SET DEFAULT 'supabase_managed';
    ALTER TABLE public.users ALTER COLUMN agreed_terms SET DEFAULT TRUE;
    ALTER TABLE public.users ALTER COLUMN agreed_privacy SET DEFAULT TRUE;

    -- Drop restrictive legacy check constraints that would prevent profile editing
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_learning_goal;
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_agreed_terms;
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_agreed_privacy;

    -- Ensure unique constraint on email for ON CONFLICT upsert
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND contype = 'u' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'email')]
    ) THEN
        BEGIN
            ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
        EXCEPTION
            WHEN duplicate_table OR duplicate_object THEN NULL;
            WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- Indexes for fast lookups & case-insensitive matching
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users (country);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON public.users (LOWER(TRIM(username)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(TRIM(email)));

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grants for roles
GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Row Level Security Policies
DROP POLICY IF EXISTS "Allow username reads" ON public.users;
DROP POLICY IF EXISTS "anon_can_read_usernames" ON public.users;
DROP POLICY IF EXISTS "Anyone can view usernames" ON public.users;
DROP POLICY IF EXISTS "Public can view usernames for leaderboard" ON public.users;
CREATE POLICY "Anyone can view usernames" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = auth_user_id
    OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated
USING (
    auth.uid() = auth_user_id
    OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
)
WITH CHECK (
    auth.uid() = auth_user_id
    OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Master Trigger Function: Auto-sync auth.users to public.users on sign-up or profile update
CREATE OR REPLACE FUNCTION public.handle_user_profile_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        auth_user_id,
        first_name,
        last_name,
        username,
        email,
        phone,
        country,
        password_hash,
        is_email_verified,
        is_active,
        learning_goal,
        referral_source,
        referral_other,
        agreed_terms,
        agreed_privacy,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'Learner'),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''), 'Other'),
        'supabase_managed',
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
        TRUE,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'learning_goal'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_source'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_other'), ''),
        TRUE,
        TRUE,
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        username = COALESCE(NULLIF(EXCLUDED.username, ''), public.users.username),
        country = COALESCE(NULLIF(EXCLUDED.country, ''), public.users.country),
        learning_goal = COALESCE(EXCLUDED.learning_goal, public.users.learning_goal),
        updated_at = now();
    RETURN NEW;
END;
$$;

-- Attach single master trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_sync_public_users ON auth.users;
CREATE TRIGGER on_auth_user_sync_public_users
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_profile_sync();


-- ==============================================================================
-- EDMITH Database Migration: Progress Tracking, Privileges, RLS & Username Rules
-- RUN THIS SQL IN THE SUPABASE SQL EDITOR (Project: jnoigbvvxwpvxefunvfc)
-- ==============================================================================

-- 1. Ensure course_progress table exists
CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Ensure lesson_progress table exists
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. Enforce Unique Constraints (user_id + course_id) and (user_id + course_id + lesson_id)
ALTER TABLE public.course_progress DROP CONSTRAINT IF EXISTS unique_user_course;
ALTER TABLE public.course_progress DROP CONSTRAINT IF EXISTS course_progress_user_course_unique;
ALTER TABLE public.course_progress ADD CONSTRAINT unique_user_course UNIQUE (user_id, course_id);

ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS unique_user_course_lesson;
ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_course_lesson_unique;
ALTER TABLE public.lesson_progress ADD CONSTRAINT unique_user_course_lesson UNIQUE (user_id, course_id, lesson_id);

-- 4. Case-Insensitive Unique Username Index on public.users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
ON public.users (lower(trim(username)));

-- 5. CRITICAL: Grant table permissions to PostgreSQL roles
-- Fixes error 42501 (permission denied for table course_progress / lesson_progress / users)
GRANT ALL ON public.course_progress TO authenticated;
GRANT ALL ON public.course_progress TO service_role;
GRANT SELECT ON public.course_progress TO anon;

GRANT ALL ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
GRANT SELECT ON public.lesson_progress TO anon;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON public.course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON public.course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_lesson ON public.lesson_progress(course_id, lesson_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies: course_progress
DROP POLICY IF EXISTS "Users can read their own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can view their own course progress" ON public.course_progress;
CREATE POLICY "Users can view their own course progress"
    ON public.course_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own course progress" ON public.course_progress;
CREATE POLICY "Users can insert their own course progress"
    ON public.course_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own course progress" ON public.course_progress;
CREATE POLICY "Users can update their own course progress"
    ON public.course_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own course progress" ON public.course_progress;
CREATE POLICY "Users can delete their own course progress"
    ON public.course_progress FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 9. Row Level Security Policies: lesson_progress
DROP POLICY IF EXISTS "Users can read their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can view their own lesson progress"
    ON public.lesson_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can insert their own lesson progress"
    ON public.lesson_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can update their own lesson progress"
    ON public.lesson_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can delete their own lesson progress"
    ON public.lesson_progress FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
	
	
	


-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial subjects
INSERT INTO public.subjects (name, slug, description, is_active)
VALUES 
    ('SQL & Databases', 'sql', 'Relational database querying, optimization, and database theory.', true),
    ('Python Mastery', 'python', 'General purpose programming, algorithms, and backend fundamentals.', false),
    ('HTML & Web Development', 'html', 'Frontend structure, semantic markup, and modern web standards.', false)
ON CONFLICT (slug) DO UPDATE SET is_active = EXCLUDED.is_active;

-- 3. Unified Test Questions Bank Table (MCQ and Coding)
CREATE TABLE IF NOT EXISTS public.test_questions (
    id SERIAL PRIMARY KEY,
    subject_slug TEXT NOT NULL DEFAULT 'sql',
    test_type TEXT NOT NULL CHECK (test_type IN ('mcq', 'coding')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    title TEXT,
    question TEXT NOT NULL,
    options JSONB, -- For MCQs: array of strings
    correct_answer TEXT, -- For MCQs: index or answer string
    problem_statement TEXT, -- For Coding
    input_description TEXT,
    output_description TEXT,
    constraints TEXT,
    starter_code TEXT,
    expected_solution TEXT,
    marks INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_filter ON public.test_questions (subject_slug, test_type, difficulty, is_active);

-- 4. Test Rounds Definitions Table
CREATE TABLE IF NOT EXISTS public.test_rounds (
    id SERIAL PRIMARY KEY,
    subject_slug TEXT NOT NULL DEFAULT 'sql',
    test_type TEXT NOT NULL CHECK (test_type IN ('mcq', 'coding')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 5),
    number_of_questions INTEGER NOT NULL,
    marks_per_question INTEGER NOT NULL,
    time_per_question_seconds INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (subject_slug, test_type, difficulty, round_number)
);

-- Seed 5 rounds for each tier
INSERT INTO public.test_rounds (subject_slug, test_type, difficulty, round_number, number_of_questions, marks_per_question)
VALUES
    ('sql', 'mcq', 'easy', 1, 15, 1), ('sql', 'mcq', 'easy', 2, 15, 1), ('sql', 'mcq', 'easy', 3, 15, 1), ('sql', 'mcq', 'easy', 4, 15, 1), ('sql', 'mcq', 'easy', 5, 15, 1),
    ('sql', 'mcq', 'medium', 1, 15, 3), ('sql', 'mcq', 'medium', 2, 15, 3), ('sql', 'mcq', 'medium', 3, 15, 3), ('sql', 'mcq', 'medium', 4, 15, 3), ('sql', 'mcq', 'medium', 5, 15, 3),
    ('sql', 'mcq', 'hard', 1, 15, 6), ('sql', 'mcq', 'hard', 2, 15, 6), ('sql', 'mcq', 'hard', 3, 15, 6), ('sql', 'mcq', 'hard', 4, 15, 6), ('sql', 'mcq', 'hard', 5, 15, 6),
    ('sql', 'coding', 'easy', 1, 5, 3), ('sql', 'coding', 'easy', 2, 5, 3), ('sql', 'coding', 'easy', 3, 5, 3), ('sql', 'coding', 'easy', 4, 5, 3), ('sql', 'coding', 'easy', 5, 5, 3),
    ('sql', 'coding', 'medium', 1, 3, 6), ('sql', 'coding', 'medium', 2, 3, 6), ('sql', 'coding', 'medium', 3, 3, 6), ('sql', 'coding', 'medium', 4, 3, 6), ('sql', 'coding', 'medium', 5, 3, 6),
    ('sql', 'coding', 'hard', 1, 2, 12), ('sql', 'coding', 'hard', 2, 2, 12), ('sql', 'coding', 'hard', 3, 2, 12), ('sql', 'coding', 'hard', 4, 2, 12), ('sql', 'coding', 'hard', 5, 2, 12)
ON CONFLICT (subject_slug, test_type, difficulty, round_number) DO NOTHING;

-- 5. Test Attempts Table
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_slug TEXT NOT NULL DEFAULT 'sql',
    test_type TEXT NOT NULL CHECK (test_type IN ('mcq', 'coding')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    round_number INTEGER NOT NULL DEFAULT 1,
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    incorrect_answers INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_answers >= 0),
    unanswered INTEGER NOT NULL DEFAULT 0 CHECK (unanswered >= 0),
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    maximum_score INTEGER NOT NULL DEFAULT 15 CHECK (maximum_score > 0),
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    rating TEXT NOT NULL DEFAULT 'Below Average',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_taken INTEGER DEFAULT 0 CHECK (time_taken >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards compatibility with sql_exam_attempts
CREATE TABLE IF NOT EXISTS public.sql_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_type TEXT NOT NULL DEFAULT 'sql_basics',
    exam_level TEXT DEFAULT 'easy',
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    incorrect_answers INTEGER NOT NULL,
    unanswered INTEGER NOT NULL,
    score INTEGER NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    rating TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    time_taken INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Test Attempt Answers Table
CREATE TABLE IF NOT EXISTS public.test_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    submitted_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    marks_awarded INTEGER NOT NULL DEFAULT 0,
    time_taken INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_sub ON public.test_attempts (user_id, subject_slug, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_attempts_leaderboard ON public.test_attempts (subject_slug, status, score DESC, completed_at ASC);

-- 7. Row Level Security (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sql_exam_attempts ENABLE ROW LEVEL SECURITY;

-- Subjects & Rounds are publicly viewable
DROP POLICY IF EXISTS "Public can view active subjects" ON public.subjects;
CREATE POLICY "Public can view active subjects" ON public.subjects FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active rounds" ON public.test_rounds;
CREATE POLICY "Public can view active rounds" ON public.test_rounds FOR SELECT USING (is_active = true);

-- Questions are readable by authenticated users
DROP POLICY IF EXISTS "Authenticated users can read test questions" ON public.test_questions;
CREATE POLICY "Authenticated users can read test questions" ON public.test_questions FOR SELECT TO authenticated USING (is_active = true);

-- Users manage their own attempts
DROP POLICY IF EXISTS "Users can view own test attempts" ON public.test_attempts;
CREATE POLICY "Users can view own test attempts" ON public.test_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own test attempts" ON public.test_attempts;
CREATE POLICY "Users can insert own test attempts" ON public.test_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own test answers" ON public.test_attempt_answers;
CREATE POLICY "Users can view own test answers" ON public.test_attempt_answers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own test answers" ON public.test_attempt_answers;
CREATE POLICY "Users can insert own test answers" ON public.test_attempt_answers FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view own legacy attempts" ON public.sql_exam_attempts;
CREATE POLICY "Users can view own legacy attempts" ON public.sql_exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own legacy attempts" ON public.sql_exam_attempts;
CREATE POLICY "Users can insert own legacy attempts" ON public.sql_exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7b. Note: public.users table schema, RLS policies, grants, and sync trigger
-- are fully declared and managed in Section 1 at the top of this script.

-- 8. UNIFIED LEADERBOARD VIEW
-- Combines MCQ and Coding test attempts by user. Only completed attempts count. 0 score is valid.
-- Counts every completed test (e.g. 1 MCQ + 2 Coding = 3 tests).
-- Joins auth.users on UUID and public.users on email matching the EDMITH user schema.
CREATE OR REPLACE VIEW public.v_sql_leaderboard AS
WITH user_completed_attempts AS (
    SELECT 
        user_id,
        difficulty,
        test_type,
        score,
        maximum_score,
        completed_at
    FROM public.test_attempts
    WHERE subject_slug = 'sql' AND status = 'completed'
),
legacy_attempts AS (
    SELECT 
        user_id,
        COALESCE(exam_level, 'easy') as difficulty,
        'mcq' as test_type,
        score,
        total_questions as maximum_score,
        completed_at
    FROM public.sql_exam_attempts
    WHERE user_id IS NOT NULL
),
all_attempts AS (
    SELECT user_id, difficulty, test_type, score, maximum_score, completed_at FROM user_completed_attempts
    UNION ALL
    SELECT user_id, difficulty, test_type, score, maximum_score, completed_at FROM legacy_attempts
        WHERE NOT EXISTS (
            SELECT 1 FROM user_completed_attempts uca 
            WHERE uca.user_id = legacy_attempts.user_id 
              AND uca.score = legacy_attempts.score 
              AND uca.test_type = 'mcq'
              AND ABS(EXTRACT(EPOCH FROM (uca.completed_at - legacy_attempts.completed_at))) < 10
        )
),
user_aggregates AS (
    SELECT 
        a.user_id,
        COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            NULLIF(p.username, ''),
            NULLIF(au.raw_user_meta_data->>'username_display', ''),
            NULLIF(au.raw_user_meta_data->>'username', ''),
            NULLIF(TRIM(CONCAT_WS(' ', au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'last_name')), ''),
            NULLIF(SPLIT_PART(au.email, '@', 1), ''),
            'Learner'
        ) AS display_name,
        SUM(CASE WHEN a.test_type = 'mcq' THEN a.score ELSE 0 END) AS mcq_score,
        SUM(CASE WHEN a.test_type = 'coding' THEN a.score ELSE 0 END) AS coding_score,
        SUM(a.score) AS total_score,
        SUM(a.maximum_score) AS max_score,
        COUNT(*) AS tests_completed,
        MAX(a.completed_at) AS latest_completed_at
    FROM all_attempts a
    LEFT JOIN auth.users au ON a.user_id = au.id
    LEFT JOIN public.users p ON LOWER(p.email) = LOWER(au.email)
    GROUP BY a.user_id, p.first_name, p.last_name, p.username, au.raw_user_meta_data, au.email
)
SELECT 
    DENSE_RANK() OVER (ORDER BY total_score DESC, latest_completed_at ASC) as rank,
    user_id,
    display_name,
    mcq_score,
    coding_score,
    total_score,
    CASE WHEN max_score > 0 THEN ROUND((total_score::numeric / max_score::numeric) * 100, 2) ELSE 0 END as percentage,
    tests_completed,
    latest_completed_at
FROM user_aggregates;

-- 9. Dynamic RPC Functions for Leaderboard Fetching & User Position
CREATE OR REPLACE FUNCTION public.get_sql_leaderboard(
    p_difficulty TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    mcq_score BIGINT,
    coding_score BIGINT,
    total_score BIGINT,
    percentage NUMERIC,
    tests_completed BIGINT,
    latest_completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT 
        v.rank,
        v.user_id,
        v.display_name,
        v.mcq_score,
        v.coding_score,
        v.total_score,
        v.percentage,
        v.tests_completed,
        v.latest_completed_at
    FROM public.v_sql_leaderboard v
    LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sql_leaderboard_position(
    p_user_id UUID
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    mcq_score BIGINT,
    coding_score BIGINT,
    total_score BIGINT,
    percentage NUMERIC,
    tests_completed BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT 
        v.rank,
        v.user_id,
        v.display_name,
        v.mcq_score,
        v.coding_score,
        v.total_score,
        v.percentage,
        v.tests_completed
    FROM public.v_sql_leaderboard v
    WHERE v.user_id = p_user_id
    LIMIT 1;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.v_sql_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sql_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sql_leaderboard_position TO anon, authenticated;
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT SELECT ON public.test_rounds TO anon, authenticated;
GRANT SELECT ON public.test_questions TO anon, authenticated;
GRANT ALL ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempt_answers TO authenticated;
GRANT ALL ON public.sql_exam_attempts TO authenticated;
GRANT SELECT ON public.users TO anon, authenticated;

-- ============================================================================
-- END OF SCHEMA SCRIPT
-- ============================================================================

-- 10. SEED TEST QUESTIONS (300 MCQs & 120 Coding Questions)
INSERT INTO public.test_questions (id, subject_slug, test_type, difficulty, title, question, options, correct_answer, marks, problem_statement, input_description, output_description, constraints, starter_code, expected_solution)
VALUES
(1, 'sql', 'mcq', 'easy', 'SQL Fundamentals', 'What does SQL stand for?', '["Structured Query Language", "Strong Question Language", "Sequential Query List", "Simple Query Logic"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'sql', 'mcq', 'easy', 'SQL Fundamentals', 'Which SQL statement is used to extract data from a database?', '["SELECT", "GET", "EXTRACT", "OPEN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which SQL clause is used to filter records?', '["WHERE", "FILTER", "SEARCH", "CONDITION"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'sql', 'mcq', 'easy', 'Queries & Projections', 'Which keyword is used to return only distinct (different) values?', '["DISTINCT", "UNIQUE", "DIFFERENT", "ISOLATED"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'Which SQL keyword is used to sort the result-set?', '["ORDER BY", "SORT BY", "ALIGN", "GROUP BY"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which SQL operator is used to test for non-existence of a value?', '["IS NULL", "EMPTY", "BLANK", "MISSING"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 'sql', 'mcq', 'easy', 'Data Modification', 'Which keyword is used to insert new rows into a table?', '["INSERT INTO", "ADD ROW", "APPEND", "INSERT NEW"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'sql', 'mcq', 'easy', 'Data Modification', 'Which statement is used to update existing records in a table?', '["UPDATE", "MODIFY", "ALTER", "CHANGE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'sql', 'mcq', 'easy', 'Data Modification', 'Which statement is used to delete records from a table?', '["DELETE FROM", "REMOVE", "DROP", "ERASE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 'sql', 'mcq', 'easy', 'Data Definition', 'Which keyword is used to delete a table completely along with its structure?', '["DROP TABLE", "DELETE TABLE", "TRUNCATE", "CLEAR"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 'sql', 'mcq', 'easy', 'Syntax & Basics', 'In SQL, string literals are enclosed in which characters?', '["Single quotes ('' '')", "Parentheses (( ))", "Angle brackets (< >)", "Curly braces ({ })"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which operator selects values within a specified inclusive range?', '["BETWEEN", "RANGE", "WITHIN", "INSIDE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which wildcard character in SQL represents zero, one, or multiple characters with LIKE?', '["%", "*", "_", "#"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which wildcard character in SQL represents a single character with LIKE?', '["_", "?", "%", "$"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 'sql', 'mcq', 'easy', 'Queries & Projections', 'How do you select all columns from a table named ''customers''?', '["SELECT * FROM customers;", "SELECT ALL FROM customers;", "GET * FROM customers;", "EXTRACT customers;"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'What is the default sort order of the ORDER BY clause?', '["Ascending (ASC)", "Descending (DESC)", "Random", "Creation order"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'Which keyword sorts records in descending order?', '["DESC", "DOWN", "DECR", "REVERSE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 'sql', 'mcq', 'easy', 'Aggregate Functions', 'Which function returns the total number of rows matching a condition?', '["COUNT()", "NUMBER()", "TOTAL()", "SUM()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 'sql', 'mcq', 'easy', 'Aggregate Functions', 'Which aggregate function returns the highest value in a column?', '["MAX()", "HIGH()", "TOP()", "PEAK()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 'sql', 'mcq', 'easy', 'Aggregate Functions', 'Which aggregate function returns the lowest value in a column?', '["MIN()", "LOW()", "BOTTOM()", "LEAST()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 'sql', 'mcq', 'easy', 'Aggregate Functions', 'Which aggregate function calculates the mathematical average of a numeric column?', '["AVG()", "MEAN()", "AVERAGE()", "MID()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 'sql', 'mcq', 'easy', 'Aggregate Functions', 'Which aggregate function calculates the sum of values in a column?', '["SUM()", "TOTAL()", "ADD()", "PLUS()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which operator allows you to specify multiple possible values in a WHERE clause?', '["IN", "ANY_OF", "OR_LIST", "CONTAINS"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(24, 'sql', 'mcq', 'easy', 'Aggregation & Grouping', 'Which clause groups rows that have the same values into summary rows?', '["GROUP BY", "SUMMARIZE", "CLUSTER", "ORDER BY"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(25, 'sql', 'mcq', 'easy', 'Aggregation & Grouping', 'Which clause is used to filter groups created by GROUP BY?', '["HAVING", "WHERE", "GROUP FILTER", "LIMIT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(26, 'sql', 'mcq', 'easy', 'Database Concepts', 'What does DDL stand for in SQL?', '["Data Definition Language", "Data Distribution Line", "Data Direct Logic", "Database Dual Link"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(27, 'sql', 'mcq', 'easy', 'Database Concepts', 'What does DML stand for in SQL?', '["Data Manipulation Language", "Database Model Logic", "Data Management Level", "Data Maintenance Layer"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(28, 'sql', 'mcq', 'easy', 'Data Definition', 'Which command removes all records from a table without logging individual row deletions?', '["TRUNCATE TABLE", "DELETE ALL", "PURGE", "WIPE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(29, 'sql', 'mcq', 'easy', 'Constraints', 'Which SQL constraint uniquely identifies each record in a database table?', '["PRIMARY KEY", "FOREIGN KEY", "CHECK", "NOT NULL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(30, 'sql', 'mcq', 'easy', 'Constraints', 'Can a primary key column contain NULL values?', '["No, never", "Yes, always", "Only if configured", "Only one NULL allowed"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(31, 'sql', 'mcq', 'easy', 'Constraints', 'Which constraint ensures that all values in a column are distinct?', '["UNIQUE", "PRIMARY", "DISTINCT", "DIFFERENT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(32, 'sql', 'mcq', 'easy', 'Constraints', 'Which constraint ensures that a column cannot have a NULL value?', '["NOT NULL", "MANDATORY", "REQUIRED", "IS NOT NULL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(33, 'sql', 'mcq', 'easy', 'Constraints', 'Which constraint sets a default value for a column when none is specified?', '["DEFAULT", "FALLBACK", "PRESET", "INITIAL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(34, 'sql', 'mcq', 'easy', 'Constraints', 'Which constraint limits the range of values that can be placed in a column?', '["CHECK", "LIMIT", "RANGE", "VALIDATE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(35, 'sql', 'mcq', 'easy', 'Constraints', 'Which constraint refers to the primary key of another table to maintain referential integrity?', '["FOREIGN KEY", "SECONDARY KEY", "LINKED KEY", "RELATION KEY"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(36, 'sql', 'mcq', 'easy', 'Joins', 'What type of JOIN returns records that have matching values in both tables?', '["INNER JOIN", "FULL JOIN", "LEFT JOIN", "CROSS JOIN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(37, 'sql', 'mcq', 'easy', 'Joins', 'Which join returns all rows from the left table and matched rows from the right table?', '["LEFT JOIN", "RIGHT JOIN", "FULL JOIN", "INNER JOIN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(38, 'sql', 'mcq', 'easy', 'Joins', 'Which join returns all rows from the right table and matched rows from the left table?', '["RIGHT JOIN", "LEFT JOIN", "OUTER JOIN", "INNER JOIN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(39, 'sql', 'mcq', 'easy', 'Joins', 'Which join returns all rows when there is a match in either left or right table?', '["FULL OUTER JOIN", "INNER JOIN", "CROSS JOIN", "NATURAL JOIN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(40, 'sql', 'mcq', 'easy', 'Joins', 'Which join combines each row of one table with every row of another table (Cartesian product)?', '["CROSS JOIN", "INNER JOIN", "LEFT JOIN", "SELF JOIN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(41, 'sql', 'mcq', 'easy', 'Set Operations', 'Which operator combines the result-set of two or more SELECT statements, removing duplicates?', '["UNION", "UNION ALL", "JOIN", "COMBINE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(42, 'sql', 'mcq', 'easy', 'Set Operations', 'Which operator combines results of multiple SELECT queries while retaining duplicate rows?', '["UNION ALL", "UNION", "MERGE", "APPEND"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(43, 'sql', 'mcq', 'easy', 'Syntax & Basics', 'What character is commonly used to end a SQL statement?', '["Semicolon (;)", "Colon (:)", "Period (.)", "Forward slash (/)"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(44, 'sql', 'mcq', 'easy', 'Syntax & Basics', 'How do you write a single-line comment in standard SQL?', '["-- comment", "// comment", "# comment", "/* comment */"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(45, 'sql', 'mcq', 'easy', 'Syntax & Basics', 'How do you write a multi-line comment in SQL?', '["/* comment */", "-- comment --", "<!-- comment -->", "'''''' comment ''''''"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(46, 'sql', 'mcq', 'easy', 'Queries & Projections', 'Which keyword is used to rename a column or table temporarily in a query?', '["AS", "RENAME", "ALIAS", "IS"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(47, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'What is the opposite of the ASC keyword in an ORDER BY clause?', '["DESC", "DOWN", "REVERSE", "DSC"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(48, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which boolean operator returns TRUE only if BOTH conditions are true?', '["AND", "OR", "XOR", "NOT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(49, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which boolean operator returns TRUE if AT LEAST ONE condition is true?', '["OR", "AND", "ANY", "EITHER"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(50, 'sql', 'mcq', 'easy', 'Filtering & Conditions', 'Which operator reverses the logical meaning of a condition?', '["NOT", "OPPOSITE", "NEGATE", "INVERT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(51, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'Which clause is used in MySQL and PostgreSQL to restrict the number of rows returned?', '["LIMIT", "TOP", "FETCH", "RESTRICT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(52, 'sql', 'mcq', 'easy', 'Sorting & Limits', 'Which keyword is used in SQL Server to specify the maximum number of rows returned?', '["TOP", "LIMIT", "FIRST", "CEIL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(53, 'sql', 'mcq', 'easy', 'Data Definition', 'Which SQL statement is used to create a new database?', '["CREATE DATABASE", "ADD DATABASE", "NEW DATABASE", "MAKE DATABASE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(54, 'sql', 'mcq', 'easy', 'Data Definition', 'Which SQL statement is used to create a new table?', '["CREATE TABLE", "ADD TABLE", "NEW TABLE", "BUILD TABLE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(55, 'sql', 'mcq', 'easy', 'Data Definition', 'Which SQL statement is used to modify the structure of an existing table?', '["ALTER TABLE", "UPDATE TABLE", "CHANGE TABLE", "MODIFY TABLE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(56, 'sql', 'mcq', 'easy', 'Data Definition', 'Which clause in ALTER TABLE is used to add a new column to a table?', '["ADD COLUMN", "NEW COLUMN", "INSERT COLUMN", "APPEND"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(57, 'sql', 'mcq', 'easy', 'Data Definition', 'Which clause in ALTER TABLE removes an existing column from a table?', '["DROP COLUMN", "DELETE COLUMN", "REMOVE COLUMN", "ERASE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(58, 'sql', 'mcq', 'easy', 'Database Concepts', 'What is an entity in a relational database?', '["A real-world object or concept represented by a table", "A single row", "A database index", "A SQL query"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(59, 'sql', 'mcq', 'easy', 'Database Concepts', 'What is an attribute in database terminology?', '["A column or property of an entity", "A primary key value", "A database connection", "A query plan"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(60, 'sql', 'mcq', 'easy', 'Database Concepts', 'What is a tuple in relational database theory?', '["A single row or record in a table", "A table schema", "A primary key", "A stored procedure"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(61, 'sql', 'mcq', 'easy', 'Database Concepts', 'What is a relation in relational database theory?', '["A table of rows and columns", "A foreign key link", "A database view", "A connection string"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(62, 'sql', 'mcq', 'easy', 'Database Concepts', 'What does RDBMS stand for?', '["Relational Database Management System", "Regional Database Memory Service", "Realtime Data Machine Software", "Remote Database Mapping Script"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(63, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type is typically used for fixed-length character strings?', '["CHAR", "VARCHAR", "TEXT", "BLOB"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(64, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type is used for variable-length character strings?', '["VARCHAR", "CHAR", "FIXED", "STATIC"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(65, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type is typically used to store whole numbers without decimals?', '["INT", "FLOAT", "DECIMAL", "VARCHAR"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(66, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type stores true or false values?', '["BOOLEAN", "BITSTRING", "CHAR", "TINYTEXT"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(67, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type is used to store calendar dates without time?', '["DATE", "TIME", "DATETIME", "TIMESTAMP"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(68, 'sql', 'mcq', 'easy', 'Data Types', 'Which data type stores both date and time values?', '["DATETIME", "DATE", "TIME", "YEAR"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(69, 'sql', 'mcq', 'easy', 'NULL Handling', 'What is a NULL value in SQL?', '["The absence of any value or unknown data", "Zero (0)", "An empty string ('''')", "A false boolean"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(70, 'sql', 'mcq', 'easy', 'NULL Handling', 'How do you test if a column ''status'' contains a NULL value?', '["WHERE status IS NULL", "WHERE status = NULL", "WHERE status == NULL", "WHERE status IS ZERO"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(71, 'sql', 'mcq', 'easy', 'NULL Handling', 'How do you test if a column ''email'' has an actual non-null value?', '["WHERE email IS NOT NULL", "WHERE email != NULL", "WHERE email <> NULL", "WHERE email HAS VALUE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(72, 'sql', 'mcq', 'easy', 'Data Modification', 'Which SQL keyword starts the condition of an UPDATE statement?', '["SET", "VALUES", "WITH", "ASSIGN"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(73, 'sql', 'mcq', 'easy', 'Data Modification', 'What happens if you run an UPDATE query without a WHERE clause?', '["All rows in the table are updated", "An error is thrown", "Only the first row updates", "Nothing happens"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(74, 'sql', 'mcq', 'easy', 'Data Modification', 'What happens if you run a DELETE statement without a WHERE clause?', '["All rows in the table are deleted", "An error is thrown", "Only the last row is deleted", "The table structure is dropped"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(75, 'sql', 'mcq', 'easy', 'Queries & Projections', 'Which clause specifies the source table in a SELECT query?', '["FROM", "INTO", "WHERE", "SOURCE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(76, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which operator checks if a string begins with ''A'' using LIKE?', '["LIKE ''A%''", "LIKE ''%A''", "LIKE ''_A''", "LIKE ''*A''"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(77, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which operator checks if a string ends with ''Z'' using LIKE?', '["LIKE ''%Z''", "LIKE ''Z%''", "LIKE ''?Z''", "LIKE ''[Z]''"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(78, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which operator checks if a string contains ''tech'' anywhere?', '["LIKE ''%tech%''", "LIKE ''tech*''", "LIKE ''_tech_''", "LIKE ''^tech''"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(79, 'sql', 'mcq', 'easy', 'Pattern Matching', 'Which operator checks if a string has exactly 3 characters?', '["LIKE ''___''", "LIKE ''%%%''", "LIKE ''***''", "LIKE ''???''"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(80, 'sql', 'mcq', 'easy', 'Constraints', 'Can a table have more than one PRIMARY KEY?', '["No, only one primary key per table", "Yes, up to 3", "Yes, unlimited", "Only if composite"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(81, 'sql', 'mcq', 'easy', 'Constraints', 'Can a table have multiple UNIQUE constraints?', '["Yes, a table can have multiple unique keys", "No, only one unique column", "Only if no primary key exists", "Only in NoSQL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(82, 'sql', 'mcq', 'easy', 'Constraints', 'Can a table have multiple FOREIGN KEY constraints?', '["Yes, referencing different or same tables", "No, only one foreign key allowed", "Only in views", "Only up to two"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(83, 'sql', 'mcq', 'easy', 'Constraints', 'What is a composite primary key?', '["A primary key consisting of two or more columns", "A primary key that links to another database", "An auto-incrementing key", "A foreign key copy"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(84, 'sql', 'mcq', 'easy', 'Views & Indexes', 'Which statement creates a virtual table based on the result-set of an SQL statement?', '["CREATE VIEW", "CREATE VIRTUAL", "CREATE MASK", "NEW VIEW"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(85, 'sql', 'mcq', 'easy', 'Views & Indexes', 'Which command is used to delete a view?', '["DROP VIEW", "DELETE VIEW", "REMOVE VIEW", "CLEAR VIEW"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(86, 'sql', 'mcq', 'easy', 'Views & Indexes', 'What database object is created to speed up data retrieval on specific columns?', '["INDEX", "TRIGGER", "SCHEMA", "SEQUENCE"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(87, 'sql', 'mcq', 'easy', 'Views & Indexes', 'Which command creates an index on a table?', '["CREATE INDEX", "ADD INDEX", "NEW INDEX", "MAKE INDEX"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(88, 'sql', 'mcq', 'easy', 'Views & Indexes', 'Which command removes an index?', '["DROP INDEX", "DELETE INDEX", "REMOVE INDEX", "CLEAR INDEX"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(89, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function returns the length of a string in SQL?', '["LENGTH()", "SIZE()", "COUNT()", "STRLEN()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(90, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function converts a string to uppercase in standard SQL?', '["UPPER()", "TO_UPPER()", "UCASE()", "CAPS()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(91, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function converts a string to lowercase?', '["LOWER()", "TO_LOWER()", "LCASE()", "DOWNCASE()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(92, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function removes leading and trailing spaces from a string?', '["TRIM()", "STRIP()", "CLEAN()", "REMOVE_SPACES()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(93, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function returns the current system date?', '["CURRENT_DATE", "NOW_DATE()", "SYSDATE_ONLY()", "TODAY()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(94, 'sql', 'mcq', 'easy', 'Built-in Functions', 'Which function returns the current date and time?', '["NOW()", "TIME_NOW()", "DATETIME()", "TODAY_TIME()"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(95, 'sql', 'mcq', 'easy', 'Arithmetic & Expressions', 'What is the result of ''SELECT 5 + 10;''?', '["15", "510", "NULL", "Error"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(96, 'sql', 'mcq', 'easy', 'Arithmetic & Expressions', 'What is the modulo operator in standard SQL used to find remainders?', '["%", "MOD", "REM", "//"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(97, 'sql', 'mcq', 'easy', 'Conditional Logic', 'Which keyword is used in a CASE expression to specify default fallback when no WHEN matches?', '["ELSE", "DEFAULT", "OTHERWISE", "CATCH"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(98, 'sql', 'mcq', 'easy', 'Conditional Logic', 'How does a CASE statement end in SQL?', '["END", "END CASE", "STOP", "FINISH"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(99, 'sql', 'mcq', 'easy', 'NULL Handling', 'Which function returns the first non-null expression among its arguments?', '["COALESCE", "IFNULL", "ISNULL", "NVL"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(100, 'sql', 'mcq', 'easy', 'Transactions', 'In a database transaction, which command saves changes permanently?', '["COMMIT", "SAVE", "APPLY", "FLUSH"]'::jsonb, '0', 1, NULL, NULL, NULL, NULL, NULL, NULL),
(101, 'sql', 'mcq', 'medium', 'Syntax Order', 'Which clause must appear immediately after the FROM clause when filtering rows?', '["WHERE", "ORDER BY", "GROUP BY", "HAVING"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(102, 'sql', 'mcq', 'medium', 'Query Optimization', 'In what logical sequence are SQL clauses processed by the query optimizer?', '["FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY", "SELECT -> FROM -> WHERE -> ORDER BY", "WHERE -> FROM -> SELECT -> GROUP BY", "ORDER BY -> SELECT -> FROM -> WHERE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(103, 'sql', 'mcq', 'medium', 'Aggregation & Grouping', 'What is the key difference between WHERE and HAVING?', '["WHERE filters individual rows before grouping; HAVING filters aggregated groups", "HAVING filters rows before grouping; WHERE filters groups", "WHERE can only be used with numbers", "HAVING cannot use comparison operators"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(104, 'sql', 'mcq', 'medium', 'Aggregate Functions', 'Can aggregate functions like SUM() or COUNT() be used inside a WHERE clause directly?', '["No, they must be used in HAVING or subqueries", "Yes, anywhere in WHERE", "Only SUM() is allowed in WHERE", "Only if combined with OR"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(105, 'sql', 'mcq', 'medium', 'Aggregate Functions', 'What does COUNT(*) return compared to COUNT(column_name)?', '["COUNT(*) counts all rows including NULLs; COUNT(column_name) counts only non-null values", "They always return the identical count", "COUNT(*) counts only primary keys", "COUNT(column) counts distinct values"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(106, 'sql', 'mcq', 'medium', 'Aggregate Functions', 'How do you count the number of UNIQUE customers who placed orders?', '["COUNT(DISTINCT customer_id)", "DISTINCT COUNT(customer_id)", "COUNT(UNIQUE customer_id)", "COUNT(customer_id) UNIQUE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(107, 'sql', 'mcq', 'medium', 'Subqueries', 'What is a subquery in SQL?', '["A query nested inside another SQL statement", "A query executed in a secondary database", "A query without a WHERE clause", "A stored procedure"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(108, 'sql', 'mcq', 'medium', 'Subqueries', 'What is a correlated subquery?', '["A subquery that references columns from the outer query", "A subquery that runs in parallel", "A subquery that produces no output", "A subquery inside an INSERT only"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(109, 'sql', 'mcq', 'medium', 'Subqueries', 'Which operator tests whether a subquery returns ANY rows at all?', '["EXISTS", "IN", "ANY", "CONTAINS"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(110, 'sql', 'mcq', 'medium', 'Subqueries', 'What does the EXISTS operator return when the subquery finds at least one matching row?', '["TRUE", "1", "The first row", "The count of rows"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(111, 'sql', 'mcq', 'medium', 'Subqueries', 'How does the IN operator behave if a subquery returns a list with a NULL value when using NOT IN?', '["NOT IN evaluates to UNKNOWN/FALSE for all rows if any NULL is present", "NULL is ignored automatically", "It returns an error", "It behaves like IN"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(112, 'sql', 'mcq', 'medium', 'Joins', 'Which join produces rows from table A that do NOT have matching rows in table B?', '["LEFT JOIN with WHERE B.key IS NULL", "INNER JOIN", "FULL JOIN", "CROSS JOIN"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(113, 'sql', 'mcq', 'medium', 'Joins', 'What is a SELF JOIN?', '["A regular join where a table is joined with itself", "A join that runs without ON condition", "An automatic join on matching column names", "A join with no foreign key"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(114, 'sql', 'mcq', 'medium', 'Joins', 'Why are table aliases necessary when performing a SELF JOIN?', '["To distinguish between the two instances of the same table", "To speed up execution", "Aliases are optional in self joins", "To prevent table locking"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(115, 'sql', 'mcq', 'medium', 'Joins', 'What does a NATURAL JOIN do?', '["Joins two tables based on all columns having matching names and types", "Performs a CROSS JOIN", "Joins on primary keys only", "Creates a new table automatically"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(116, 'sql', 'mcq', 'medium', 'Subqueries', 'Which operator compares a scalar value with every value returned by a subquery and returns TRUE only if all match?', '["ALL", "ANY", "SOME", "EXISTS"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(117, 'sql', 'mcq', 'medium', 'Subqueries', 'Which operator returns TRUE if a comparison is true for at least one value returned by a subquery?', '["ANY (or SOME)", "ALL", "EXISTS", "BETWEEN"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(118, 'sql', 'mcq', 'medium', 'Aggregate Functions', 'What happens to NULL values when calculating AVG(salary)?', '["NULL values are ignored in the calculation", "NULL values are treated as 0", "The query returns NULL for the whole average", "An error occurs"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(119, 'sql', 'mcq', 'medium', 'NULL Handling', 'What is the result of ''NULL = NULL'' in three-valued SQL logic?', '["UNKNOWN", "TRUE", "FALSE", "NULL pointer"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(120, 'sql', 'mcq', 'medium', 'NULL Handling', 'Which function in standard SQL replaces a NULL value with a specified alternative?', '["COALESCE(val, replacement)", "REPLACE(val, replacement)", "SUBSTITUTE(val, replacement)", "IFEMPTY(val, replacement)"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(121, 'sql', 'mcq', 'medium', 'NULL Handling', 'What does the NULLIF(exp1, exp2) function return if exp1 equals exp2?', '["NULL", "exp1", "0", "TRUE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(122, 'sql', 'mcq', 'medium', 'Constraints', 'What is the effect of the CASCADE option in ''ON DELETE CASCADE'' for a foreign key?', '["Deleting the parent row automatically deletes all corresponding child rows", "Prevents deletion of parent row", "Sets child foreign keys to NULL", "Generates an error"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(123, 'sql', 'mcq', 'medium', 'Constraints', 'What is the effect of ''ON DELETE SET NULL''?', '["Child foreign key values are set to NULL when the parent record is deleted", "The child row is deleted", "Parent row cannot be deleted", "Foreign key is disabled"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(124, 'sql', 'mcq', 'medium', 'Constraints', 'What is the effect of ''ON DELETE RESTRICT''?', '["Prevents the parent row from being deleted if child rows exist", "Deletes child rows silently", "Sets parent key to NULL", "Disables database logging"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(125, 'sql', 'mcq', 'medium', 'Set Operations', 'What is the difference between UNION and UNION ALL in terms of performance?', '["UNION ALL is faster because it does not sort or deduplicate results", "UNION is faster because it removes duplicates", "Both have identical performance", "UNION uses no memory"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(126, 'sql', 'mcq', 'medium', 'Set Operations', 'Which set operation returns only records present in BOTH SELECT statements?', '["INTERSECT", "UNION", "EXCEPT", "MINUS"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(127, 'sql', 'mcq', 'medium', 'Set Operations', 'Which set operation returns records in the first query that are NOT in the second query?', '["EXCEPT (or MINUS)", "INTERSECT", "UNION ALL", "DIFF"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(128, 'sql', 'mcq', 'medium', 'Set Operations', 'How many columns must queries in a UNION have?', '["They must have the exact same number of columns in compatible data types", "Different column counts are fine", "Only one column allowed", "Any number as long as names match"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(129, 'sql', 'mcq', 'medium', 'Data Definition', 'Which statement correctly modifies an existing column''s data type in PostgreSQL/standard SQL?', '["ALTER TABLE t ALTER COLUMN c TYPE new_type;", "ALTER TABLE t CHANGE c new_type;", "MODIFY TABLE t COLUMN c new_type;", "UPDATE t SET TYPE c = new_type;"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(130, 'sql', 'mcq', 'medium', 'Constraints', 'Which constraint syntax ensures an employee''s salary is greater than 0?', '["CHECK (salary > 0)", "VALIDATE (salary > 0)", "CONSTRAINT salary > 0", "RULE (salary > 0)"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(131, 'sql', 'mcq', 'medium', 'Indexing', 'What is a Clustered Index?', '["An index that determines the physical storage order of rows in a table", "An index stored in memory only", "An index for full-text search", "A cluster of multiple servers"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(132, 'sql', 'mcq', 'medium', 'Indexing', 'How many clustered indexes can a relational table have?', '["Only one", "Up to two", "As many as columns", "Unlimited"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(133, 'sql', 'mcq', 'medium', 'Indexing', 'What is a Non-Clustered Index?', '["A separate structure containing pointer values to the physical table data", "A clustered index copy", "An index that cannot be searched", "A temporary index in tempdb"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(134, 'sql', 'mcq', 'medium', 'Transactions', 'Which SQL keyword ensures that a transaction''s operations are all committed or all undone?', '["ATOMICITY (Transactions)", "NORMALIZATION", "REDUNDANCY", "ISOLATION"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(135, 'sql', 'mcq', 'medium', 'Transactions', 'Which transaction command undoes all uncommitted changes since the last commit or savepoint?', '["ROLLBACK", "UNDO", "REVERT", "RESET"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(136, 'sql', 'mcq', 'medium', 'Transactions', 'Which command sets an intermediate point within a transaction that can be rolled back to?', '["SAVEPOINT", "CHECKPOINT", "BOOKMARK", "BREAKPOINT"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(137, 'sql', 'mcq', 'medium', 'Transactions', 'What does ACID stand for in database management?', '["Atomicity, Consistency, Isolation, Durability", "Accuracy, Control, Indexing, Delivery", "Automatic, Concurrent, Isolated, Dynamic", "Access, Concurrency, Integrity, Distribution"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(138, 'sql', 'mcq', 'medium', 'Transactions', 'Which ACID property ensures that transactions execute without interfering with one another concurrently?', '["Isolation", "Atomicity", "Consistency", "Durability"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(139, 'sql', 'mcq', 'medium', 'Transactions', 'Which ACID property guarantees that committed transactions survive system crashes?', '["Durability", "Atomicity", "Consistency", "Isolation"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(140, 'sql', 'mcq', 'medium', 'Normalization', 'What is First Normal Form (1NF)?', '["Each column contains atomic (indivisible) values, and each record is unique", "All non-key columns depend on the whole key", "No transitive dependencies exist", "Every table has a foreign key"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(141, 'sql', 'mcq', 'medium', 'Normalization', 'What is Second Normal Form (2NF)?', '["Table is in 1NF and all non-key columns are fully functionally dependent on the entire primary key", "Table contains no foreign keys", "Table is in 3NF", "All fields are VARCHAR"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(142, 'sql', 'mcq', 'medium', 'Normalization', 'What is Third Normal Form (3NF)?', '["Table is in 2NF and contains no transitive dependencies among non-key attributes", "Table has three primary keys", "Table contains no NULL values", "Table has 3 joined views"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(143, 'sql', 'mcq', 'medium', 'Database Design', 'What is a surrogate key?', '["An artificial key (like an auto-incrementing ID) created to uniquely identify a record", "A composite business key", "A foreign key pointing to itself", "A temporary index key"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(144, 'sql', 'mcq', 'medium', 'Database Design', 'What is a natural key?', '["A real-world unique attribute (like Social Security Number or ISBN)", "A random UUID", "An auto-incremented integer", "A database timestamp"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(145, 'sql', 'mcq', 'medium', 'Syntax Order', 'Which SQL clause is used to filter records before any grouping takes place?', '["WHERE", "HAVING", "QUALIFY", "ORDER BY"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(146, 'sql', 'mcq', 'medium', 'Syntax Order', 'Can you use column aliases defined in the SELECT list inside the WHERE clause of the same query?', '["No, because WHERE is processed before SELECT", "Yes, always", "Only in SQL Server", "Only if alias is in quotes"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(147, 'sql', 'mcq', 'medium', 'Syntax Order', 'Can you use column aliases defined in SELECT inside the ORDER BY clause?', '["Yes, because ORDER BY is evaluated after SELECT", "No, never", "Only if wrapped in functions", "Only with numbers"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(148, 'sql', 'mcq', 'medium', 'String Functions', 'What is the result of ''SELECT CONCAT(''Hello'', '' '', ''World'');'' in standard SQL?', '["Hello World", "Hello+World", "HelloWorld", "Error"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(149, 'sql', 'mcq', 'medium', 'String Functions', 'Which function extracts a portion of a string in SQL?', '["SUBSTRING() (or SUBSTR())", "PART()", "SLICE()", "PORTION()"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(150, 'sql', 'mcq', 'medium', 'String Functions', 'Which function finds the position of a substring within a string?', '["INSTR() / POSITION() / CHARINDEX()", "FIND()", "SEARCH()", "LOCATE_EX()"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(151, 'sql', 'mcq', 'medium', 'Numeric Functions', 'What does ROUND(123.456, 2) return?', '["123.46", "123.45", "123.50", "124.00"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(152, 'sql', 'mcq', 'medium', 'Numeric Functions', 'What does CEILING(4.2) / CEIL(4.2) return?', '["5", "4", "4.2", "4.5"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(153, 'sql', 'mcq', 'medium', 'Numeric Functions', 'What does FLOOR(4.8) return?', '["4", "5", "4.8", "4.5"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(154, 'sql', 'mcq', 'medium', 'Numeric Functions', 'Which function returns the absolute (positive) value of a number?', '["ABS()", "POS()", "MAGNITUDE()", "POSITIVE()"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(155, 'sql', 'mcq', 'medium', 'Pattern Matching', 'How do you select customers whose name starts with ''B'' or ''C'' using regex/wildcards?', '["WHERE name LIKE ''B%'' OR name LIKE ''C%''", "WHERE name IN (''B'', ''C'')", "WHERE name LIKE ''B%C%''", "WHERE name BETWEEN ''B'' AND ''C''"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(156, 'sql', 'mcq', 'medium', 'Filtering & Conditions', 'Which operator tests if a value matches any value in a subquery or list?', '["IN", "EXISTS", "BETWEEN", "LIKE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(157, 'sql', 'mcq', 'medium', 'Programmability', 'What is a Stored Procedure?', '["A prepared SQL code snippet that you can save and reuse", "A table backup", "A temporary database table", "An automated indexer"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(158, 'sql', 'mcq', 'medium', 'Programmability', 'How do you execute a stored procedure in SQL?', '["EXEC (or EXECUTE / CALL)", "RUN PROCEDURE", "START", "OPEN"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(159, 'sql', 'mcq', 'medium', 'Programmability', 'What is a Database Trigger?', '["A procedural code block that runs automatically when a specified event occurs on a table", "A scheduled cron job", "An interactive form", "A table lock"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(160, 'sql', 'mcq', 'medium', 'Programmability', 'Which event types can trigger a database trigger?', '["INSERT, UPDATE, DELETE", "SELECT, ORDER BY", "COMMIT, ROLLBACK", "GRANT, REVOKE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(161, 'sql', 'mcq', 'medium', 'Data Modification', 'What is the purpose of the TRUNCATE command compared to DELETE?', '["TRUNCATE resets identity counters and deallocates pages quickly without firing delete triggers", "TRUNCATE allows filtering with WHERE", "TRUNCATE keeps row logs", "TRUNCATE deletes table definition"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(162, 'sql', 'mcq', 'medium', 'Data Modification', 'Can a TRUNCATE statement have a WHERE clause?', '["No, TRUNCATE always empties the entire table", "Yes, in PostgreSQL only", "Yes, with CASCADE", "Only if table has primary key"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(163, 'sql', 'mcq', 'medium', 'NULL Handling', 'What is the purpose of the COALESCE function when summing columns with possible NULLs?', '["To convert NULLs to 0 so mathematical addition succeeds properly", "To delete rows with NULLs", "To sort NULLs last", "To create a foreign key"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(164, 'sql', 'mcq', 'medium', 'Advanced SQL', 'What is a Cross-Tabulation / Pivot in SQL?', '["Transforming row data into columns for summary reporting", "A full outer join", "Deleting unneeded columns", "A primary key index"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(165, 'sql', 'mcq', 'medium', 'Common Table Expressions', 'Which clause provides a way to write auxiliary statements for use in a larger query (Common Table Expression)?', '["WITH", "ALIAS", "LET", "SUB"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(166, 'sql', 'mcq', 'medium', 'Common Table Expressions', 'What is a CTE in SQL?', '["Common Table Expression (a named temporary result set)", "Continuous Table Export", "Clustered Transaction Entity", "Control Type Element"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(167, 'sql', 'mcq', 'medium', 'Common Table Expressions', 'How do you define a Common Table Expression?', '["WITH cte_name AS (SELECT ...)", "CREATE CTE cte_name AS ...", "TEMP cte_name = ...", "SET cte_name = SELECT ..."]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(168, 'sql', 'mcq', 'medium', 'Common Table Expressions', 'What is the benefit of a CTE over a subquery?', '["Improves query readability and can be referenced multiple times or recursively", "Always executes 10x faster", "Bypasses all table locks", "Automatically creates indexes"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(169, 'sql', 'mcq', 'medium', 'Date Functions', 'Which function returns the number of days between two dates in SQL?', '["DATEDIFF() / AGE()", "DAYS_BETWEEN()", "DATE_SPAN()", "DIFF_DATE()"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(170, 'sql', 'mcq', 'medium', 'Date Functions', 'Which function extracts the year from a date value?', '["EXTRACT(YEAR FROM date_col) / YEAR(date_col)", "GET_YEAR(date_col)", "YEAROF(date_col)", "DATE_YEAR(date_col)"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(171, 'sql', 'mcq', 'medium', 'Transactions', 'What is a database transaction isolation level?', '["The degree to which a transaction must be isolated from data modifications made by other transactions", "The speed of commit operations", "The number of concurrent users allowed", "The security privilege of the DBA"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(172, 'sql', 'mcq', 'medium', 'Transactions', 'Which is the lowest transaction isolation level?', '["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(173, 'sql', 'mcq', 'medium', 'Transactions', 'What is a ''Dirty Read'' in transaction processing?', '["Reading uncommitted data modified by another concurrent transaction", "Reading data from a corrupted disk", "Reading rows without an index", "Reading duplicate records"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(174, 'sql', 'mcq', 'medium', 'Transactions', 'What is a ''Non-Repeatable Read''?', '["A transaction reads the same row twice and finds different data because another transaction committed an update", "A query that fails on repeat", "A database timeout", "A primary key collision"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(175, 'sql', 'mcq', 'medium', 'Transactions', 'What is a ''Phantom Read''?', '["A transaction re-executes a range query and finds new rows inserted by another committed transaction", "A query executed on a dropped table", "A deleted row that still appears in cache", "An unindexed scan"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(176, 'sql', 'mcq', 'medium', 'Transactions', 'Which isolation level prevents all phenomena (Dirty Read, Non-repeatable Read, Phantom Read)?', '["Serializable", "Repeatable Read", "Read Committed", "Read Uncommitted"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(177, 'sql', 'mcq', 'medium', 'Security & DCL', 'Which SQL clause is used to grant privileges to users on database objects?', '["GRANT", "ALLOW", "AUTHORIZE", "PERMIT"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(178, 'sql', 'mcq', 'medium', 'Security & DCL', 'Which SQL clause is used to withdraw previously granted privileges?', '["REVOKE", "REMOVE", "DENY", "CANCEL"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(179, 'sql', 'mcq', 'medium', 'Database Concepts', 'What does DCL stand for in SQL?', '["Data Control Language", "Database Connection Logic", "Data Creation Layer", "Distributed Control List"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(180, 'sql', 'mcq', 'medium', 'Database Concepts', 'What does TCL stand for in SQL?', '["Transaction Control Language", "Table Creation Logic", "Temporary Connection Layer", "Total Control Level"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(181, 'sql', 'mcq', 'medium', 'Transactions', 'What is the default isolation level in many popular RDBMS like PostgreSQL and Oracle?', '["Read Committed", "Read Uncommitted", "Repeatable Read", "Serializable"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(182, 'sql', 'mcq', 'medium', 'Data Modification', 'How do you write an INSERT statement that inserts the results of a SELECT query directly?', '["INSERT INTO table2 SELECT * FROM table1;", "INSERT INTO table2 FROM table1;", "COPY table1 TO table2;", "ADD table2 AS SELECT * FROM table1;"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(183, 'sql', 'mcq', 'medium', 'Data Modification', 'What statement copies data from one table into a NEW table created on the fly?', '["SELECT INTO (or CREATE TABLE AS SELECT)", "INSERT INTO NEW", "DUPLICATE TABLE", "CLONE TABLE"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(184, 'sql', 'mcq', 'medium', 'Conditional Logic', 'Which clause allows handling conditional logic inside a single SELECT column projection?', '["CASE WHEN ... THEN ... ELSE ... END", "IF ... THEN ... ELSE", "SWITCH ... CASE", "TRY ... CATCH"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(185, 'sql', 'mcq', 'medium', 'Conditional Logic', 'Can a single CASE expression have multiple WHEN conditions?', '["Yes, evaluated sequentially from top to bottom", "No, maximum 2 WHEN clauses allowed", "Only if connected with UNION", "Only in stored procedures"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(186, 'sql', 'mcq', 'medium', 'Conditional Logic', 'What does a CASE statement return if no WHEN matches and there is NO ELSE clause?', '["NULL", "0", "An error", "False"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(187, 'sql', 'mcq', 'medium', 'Operators', 'Which SQL operator checks if a value is NOT equal in standard SQL?', '["<> (or !=)", "==", "!==", "NOT =="]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(188, 'sql', 'mcq', 'medium', 'Subqueries', 'What does the EXISTS operator return if the subquery returns 0 rows?', '["FALSE", "NULL", "0", "UNKNOWN"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(189, 'sql', 'mcq', 'medium', 'Views & Subqueries', 'What is an inline view in SQL?', '["A subquery placed in the FROM clause with an alias", "A view stored in memory", "A view that cannot be dropped", "A materialized view"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(190, 'sql', 'mcq', 'medium', 'Views', 'What is a materialized view?', '["A view whose result set is physically computed and stored on disk", "A standard virtual view", "A temporary table created per session", "A view that updates automatically every second"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(191, 'sql', 'mcq', 'medium', 'Views', 'How do you refresh the data in a materialized view in PostgreSQL?', '["REFRESH MATERIALIZED VIEW view_name;", "UPDATE VIEW view_name;", "REBUILD VIEW view_name;", "SYNC VIEW view_name;"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(192, 'sql', 'mcq', 'medium', 'Integrity', 'What is referential integrity?', '["A state where every foreign key value always points to an existing valid primary key", "A database without NULL values", "Fast index retrieval", "Daily database backups"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(193, 'sql', 'mcq', 'medium', 'Integrity', 'What is domain integrity?', '["Enforcing valid values for a column via data types, format, and CHECK constraints", "Connecting to a web domain", "Restricting database user logins", "Primary key uniqueness"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(194, 'sql', 'mcq', 'medium', 'Integrity', 'What is entity integrity?', '["Ensuring that every table has a unique primary key that is not null", "Table normalization to 3NF", "Preventing SQL injection", "Replicating database tables"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(195, 'sql', 'mcq', 'medium', 'Set Operations', 'Which SQL keyword ensures that duplicates are eliminated when combining query outputs?', '["UNION", "UNION ALL", "MERGE ALL", "CONCAT"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(196, 'sql', 'mcq', 'medium', 'Indexing', 'What is a composite index?', '["An index on two or more columns of a table", "An index combining two separate tables", "An index created from a view", "A primary key and foreign key combined"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(197, 'sql', 'mcq', 'medium', 'Indexing', 'In a composite index on (colA, colB), which query can effectively use the index?', '["A query filtering on colA alone or (colA AND colB)", "A query filtering on colB alone only", "A query with no WHERE clause", "A query using full-text search"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(198, 'sql', 'mcq', 'medium', 'Indexing', 'What is the leftmost prefix rule in database indexing?', '["A composite index can only be used by queries filtering on the leftmost column of the index", "Indexes only index the first 10 characters", "Left join cannot use indexes", "The first row in a table cannot be deleted"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(199, 'sql', 'mcq', 'medium', 'Query Optimization', 'What is an execution plan in an RDBMS?', '["A sequence of operations determined by the query optimizer to execute a query efficiently", "A schedule for database backups", "A list of database users", "A disaster recovery script"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(200, 'sql', 'mcq', 'medium', 'Query Optimization', 'Which command displays the execution plan of a query in PostgreSQL and MySQL?', '["EXPLAIN (or EXPLAIN ANALYZE)", "SHOW PLAN", "DESCRIBE QUERY", "VIEW EXECUTION"]'::jsonb, '0', 3, NULL, NULL, NULL, NULL, NULL, NULL),
(201, 'sql', 'mcq', 'hard', 'Window Functions', 'What is the primary function of window functions in SQL?', '["Perform calculations across a set of table rows related to the current row without collapsing them into a single row", "Aggregate rows into one single row like GROUP BY", "Create browser windows for SQL results", "Split a table into multiple physical partitions"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(202, 'sql', 'mcq', 'hard', 'Window Functions', 'Which clause specifies the window partition and ordering for a window function?', '["OVER (PARTITION BY ... ORDER BY ...)", "WINDOW (GROUP BY ...)", "ACROSS (SPLIT BY ...)", "APPLY (ORDER BY ...)"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(203, 'sql', 'mcq', 'hard', 'Window Functions', 'What is the difference between ROW_NUMBER(), RANK(), and DENSE_RANK() when ties exist?', '["ROW_NUMBER gives strictly sequential numbers; RANK skips ranks after ties; DENSE_RANK does not skip ranks", "RANK gives sequential numbers without ties; DENSE_RANK skips; ROW_NUMBER is random", "They produce identical outputs in all SQL standards", "DENSE_RANK only works on dense integers"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(204, 'sql', 'mcq', 'hard', 'Window Functions', 'If three items tie for 1st place, what rank does DENSE_RANK() assign to the next item?', '["2", "4", "3", "NULL"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(205, 'sql', 'mcq', 'hard', 'Window Functions', 'If three items tie for 1st place, what rank does the standard RANK() function assign to the next item?', '["4", "2", "3", "1"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(206, 'sql', 'mcq', 'hard', 'Window Functions', 'Which window function retrieves data from the immediately preceding row within the same window partition?', '["LAG()", "LEAD()", "PREV()", "PRIOR()"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(207, 'sql', 'mcq', 'hard', 'Window Functions', 'Which window function retrieves data from a subsequent row without an explicit self-join?', '["LEAD()", "LAG()", "NEXT()", "FORWARD()"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(208, 'sql', 'mcq', 'hard', 'Window Functions', 'What does the NTILE(4) window function do when applied to a result set?', '["Divides the sorted rows into 4 approximately equal quartiles / buckets", "Returns the 4th row only", "Repeats the query 4 times", "Multiplies values by 4"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(209, 'sql', 'mcq', 'hard', 'Window Functions', 'What is the purpose of the frame specification ''ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW'' in window aggregations?', '["Computes a running cumulative total from the start of the partition up to the current row", "Computes the average across the entire table only", "Limits the partition to 1 row", "Selects all rows except current row"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(210, 'sql', 'mcq', 'hard', 'Window Functions', 'What does ''ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING'' calculate when used with AVG(val)?', '["A 3-row moving average (previous row, current row, next row)", "An average of 1 row", "An error", "The cumulative total"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(211, 'sql', 'mcq', 'hard', 'Recursive Queries', 'What is a Recursive Common Table Expression (Recursive CTE)?', '["A CTE that references itself to query hierarchical or graph-structured data like org charts and trees", "A query that causes an infinite loop error", "A nested view inside an index", "A trigger that calls itself"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(212, 'sql', 'mcq', 'hard', 'Recursive Queries', 'What two components must every recursive CTE contain joined by UNION ALL?', '["Anchor member (base query) and Recursive member (referencing the CTE)", "Primary key query and foreign key query", "GROUP BY clause and HAVING clause", "INSERT query and SELECT query"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(213, 'sql', 'mcq', 'hard', 'Recursive Queries', 'What condition terminates recursion in a recursive CTE?', '["When the recursive member returns an empty result set (or reaches MAXRECURSION limit)", "When the user presses Stop", "When the table has zero rows", "When a ROLLBACK command runs"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(214, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is a Deadlock in an RDBMS?', '["A situation where two or more transactions hold locks and each waits for the other to release locks, causing indefinite blocking", "A corrupted database file", "A crashed server connection", "An unindexed full table scan"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(215, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'How does an RDBMS engine typically resolve a deadlock?', '["By automatically detecting the deadlock cycle and killing (rolling back) one transaction as the deadlock victim", "By stopping the entire database server", "By converting all locks to read locks", "By committing both transactions simultaneously"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(216, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is the difference between an Shared Lock (S-lock) and an Exclusive Lock (X-lock)?', '["Multiple transactions can hold Shared locks for reading; only one transaction can hold an Exclusive lock for writing", "Shared locks are for writing; Exclusive locks are for reading", "Shared locks cannot be used on tables", "Exclusive locks permit other transactions to read"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(217, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is Intent Lock in hierarchical database locking?', '["A lock placed at a higher level (like table) indicating an intention to acquire lower-level locks (like row)", "A lock requested but not yet granted", "A lock that releases automatically in 1ms", "A lock placed only on indexes"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(218, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is Two-Phase Locking (2PL)?', '["A concurrency protocol where transactions acquire all locks during a growing phase and release them in a shrinking phase", "Locking two tables at the same time", "A lock that requires two passwords", "Two database servers locking data"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(219, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is Optimistic Concurrency Control (OCC)?', '["Transactions execute without locking, and verify at commit time that no conflict occurred using timestamps or versions", "Assuming all transactions will fail", "Locking all tables permanently", "Running queries without transactions"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(220, 'sql', 'mcq', 'hard', 'Concurrency & Locking', 'What is Pessimistic Concurrency Control?', '["Locking data records at read/access time to prevent any concurrent modifications until complete", "Refusing to execute concurrent queries", "Rolling back all transactions by default", "Never using indexes"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(221, 'sql', 'mcq', 'hard', 'Storage & Recovery', 'What is Write-Ahead Logging (WAL) in database storage engines?', '["A technique where data changes are written to a sequential log on disk before being applied to the data pages", "Logging queries after writing to disk", "Writing logs only on server shutdown", "A client-side audit file"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(222, 'sql', 'mcq', 'hard', 'Storage & Recovery', 'Why is Write-Ahead Logging critical for Durability (in ACID)?', '["It allows point-in-time recovery and replay of committed transactions after power failures", "It speeds up SELECT queries", "It prevents duplicate keys", "It compresses text data"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(223, 'sql', 'mcq', 'hard', 'Storage & Recovery', 'What is a Checkpoint in database storage architecture?', '["A synchronization event where dirty memory pages are flushed to physical disk and the WAL is truncated", "A savepoint inside a transaction", "A primary key constraint check", "A database backup to tape"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(224, 'sql', 'mcq', 'hard', 'Indexing & Performance', 'What is a Covering Index?', '["An index that contains all columns requested by a query, satisfying it completely from the index without accessing the table heap", "An index that covers the entire hard drive", "An index created on every column of a table", "A clustered index on foreign keys"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(225, 'sql', 'mcq', 'hard', 'Query Optimization', 'What is an Index Seek versus an Index Scan?', '["Index Seek traverses the tree directly to qualifying rows; Index Scan reads through the entire index leaf level", "Index Scan is always faster than Seek", "Seek only works on primary keys", "Scan only works on temporary tables"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(226, 'sql', 'mcq', 'hard', 'Query Optimization', 'What is a Table Scan (Sequential Scan)?', '["Scanning every single page and row in the table because no usable index exists for the query", "Reading index pointers in order", "A fast binary search", "A partition scan only"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(227, 'sql', 'mcq', 'hard', 'Query Optimization', 'What causes sargability (Search Argument Ability) to be lost in an index query?', '["Applying functions or calculations to indexed columns in the WHERE clause (e.g. WHERE YEAR(date_col) = 2024)", "Using an equality comparison (=)", "Using BETWEEN on indexed columns", "Joining on primary keys"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(228, 'sql', 'mcq', 'hard', 'Query Optimization', 'How can you rewrite ''WHERE UPPER(username) = ''ALICE'''' to maintain index usage?', '["Store normalized lowercase/uppercase usernames, or create a function-based/expression index on UPPER(username)", "Use LIKE ''%ALICE%''", "Use WHERE username != ''ALICE''", "Use a CROSS JOIN"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(229, 'sql', 'mcq', 'hard', 'Indexing & Performance', 'What is a Filtered Index (Partial Index)?', '["An index created on a subset of rows meeting a specific predicate (e.g., WHERE is_active = TRUE)", "An index that filters out duplicate characters", "An index that cannot be updated", "A full-text index on text columns"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(230, 'sql', 'mcq', 'hard', 'Internal Structures', 'What is a B-Tree index structure in relational databases?', '["A balanced tree structure where leaf nodes are linked sequentially and contain indexed keys and row pointers", "A binary tree with 2 branches per node", "A hash table storing key-value pairs", "A flat array of sorted rows"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(231, 'sql', 'mcq', 'hard', 'Internal Structures', 'Why are B-Trees preferred over Hash indexes for general relational databases?', '["B-Trees efficiently support range queries (<, >, BETWEEN) as well as exact lookups and sorting", "B-Trees take zero disk space", "Hash indexes cannot do exact matches", "B-Trees do not require disk access"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(232, 'sql', 'mcq', 'hard', 'Internal Structures', 'When is a Hash Index optimal?', '["For fast O(1) equality lookups (=, IN) when range queries are never needed", "For sorting with ORDER BY", "For LIKE ''%prefix%'' searches", "For finding minimum values"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(233, 'sql', 'mcq', 'hard', 'Database Scaling', 'What is Table Partitioning in high-volume database systems?', '["Dividing a large logical table into smaller physical pieces based on range, list, or hash key", "Splitting columns into separate databases", "Creating views for each user", "Compressing tables with gzip"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(234, 'sql', 'mcq', 'hard', 'Database Scaling', 'What is Partition Pruning in query optimization?', '["The query optimizer eliminates partitions that cannot possibly contain matching data based on query predicates", "Deleting old partitions to save disk", "Compressing partition indexes", "Moving partitions between servers"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(235, 'sql', 'mcq', 'hard', 'Database Scaling', 'What is Horizontal Partitioning (Sharding)?', '["Splitting rows of a table across multiple independent physical database servers", "Splitting columns across different tables", "Normalizing to Boyce-Codd Normal Form", "Creating backup replicas"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(236, 'sql', 'mcq', 'hard', 'Database Scaling', 'What is Vertical Partitioning?', '["Splitting columns of a table into separate tables with a shared primary key to reduce row width and I/O", "Splitting rows into date ranges", "Adding more CPUs to the server", "Creating vertical clustered indexes"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(237, 'sql', 'mcq', 'hard', 'Database Scaling', 'What is Database Sharding?', '["A horizontal partitioning architecture where subsets of data are distributed across distinct database nodes", "Creating database backups on cloud storage", "Encrypting database disk volumes", "Running queries in parallel"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(238, 'sql', 'mcq', 'hard', 'Normalization', 'What is Boyce-Codd Normal Form (BCNF)?', '["A stricter version of 3NF where for every functional dependency X -> Y, X must be a superkey", "A form requiring 4 primary keys", "A non-relational database standard", "Denormalized table design"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(239, 'sql', 'mcq', 'hard', 'Normalization', 'What is Fourth Normal Form (4NF)?', '["Table is in BCNF and contains no multi-valued dependencies", "Table contains four partitions", "Table has four foreign keys", "Table with JSON columns"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(240, 'sql', 'mcq', 'hard', 'Normalization', 'What is Fifth Normal Form (5NF / Project-Join Normal Form)?', '["Table is in 4NF and cannot be decomposed into smaller tables without loss of join integrity", "Table contains five distinct indexes", "A table distributed across 5 clouds", "A star schema structure"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(241, 'sql', 'mcq', 'hard', 'Data Warehousing', 'What is Denormalization and why is it deliberately used in Data Warehouses?', '["Intentionally introducing redundant data to minimize expensive joins and accelerate analytical read performance", "Fixing corrupt databases", "Deleting primary keys to save space", "Converting SQL tables to CSV"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(242, 'sql', 'mcq', 'hard', 'Data Warehousing', 'What is a Star Schema in analytical database design?', '["A schema design where a centralized Fact table connects directly to multiple Denormalized Dimension tables", "A database network arranged in a star topology", "A table with 5 foreign keys", "An encrypted relational model"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(243, 'sql', 'mcq', 'hard', 'Data Warehousing', 'What is a Snowflake Schema?', '["A variation of a star schema where dimension tables are normalized into sub-dimensions", "A frozen backup image", "A schema where fact tables have no keys", "A distributed NoSQL cluster"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(244, 'sql', 'mcq', 'hard', 'Data Warehousing', 'What is the primary difference between OLTP and OLAP systems?', '["OLTP is optimized for high volumes of fast transactional writes/updates; OLAP is optimized for complex read-heavy analytical queries", "OLTP is for analytics; OLAP is for e-commerce checkouts", "OLTP does not use SQL; OLAP uses SQL", "OLAP has no database tables"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(245, 'sql', 'mcq', 'hard', 'Advanced DML', 'What is an Upsert operation in SQL?', '["An atomic operation that inserts a new row or updates it if a unique/primary key conflict occurs (MERGE / ON CONFLICT DO UPDATE)", "Uploading data from a spreadsheet", "Updating every row in a table", "Upgrading the database version"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(246, 'sql', 'mcq', 'hard', 'Advanced DML', 'How is an Upsert written in PostgreSQL?', '["INSERT INTO t (id, val) VALUES (1, ''A'') ON CONFLICT (id) DO UPDATE SET val = EXCLUDED.val;", "UPSERT INTO t VALUES (1, ''A'');", "MERGE INTO t UPDATE (id, val);", "INSERT OR UPDATE INTO t VALUES (1, ''A'');"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(247, 'sql', 'mcq', 'hard', 'Advanced DML', 'What does the EXCLUDED pseudo-table represent in PostgreSQL ON CONFLICT DO UPDATE?', '["The row values that were proposed for insertion in the current statement", "Rows that were deleted by the conflict", "A temporary table in tempdb", "Rows that failed constraint checks"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(248, 'sql', 'mcq', 'hard', 'Advanced DML', 'What is the purpose of the MERGE statement in SQL:2003 standard?', '["Provides a single statement to INSERT, UPDATE, or DELETE target table rows based on comparison with a source dataset", "Combines two database instances into one", "Performs a UNION of two queries", "Defragments table indexes"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(249, 'sql', 'mcq', 'hard', 'Advanced Joins', 'What is a Lateral Join (CROSS JOIN LATERAL / APPLY)?', '["A join that allows a subquery in the FROM clause to reference columns provided by preceding tables in the same FROM clause", "A join across two separate physical servers", "A join that runs horizontally across columns", "A full outer join with self references"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(250, 'sql', 'mcq', 'hard', 'Advanced Joins', 'What is the difference between CROSS APPLY and OUTER APPLY in SQL Server / Oracle?', '["CROSS APPLY acts like an INNER JOIN evaluating the table-valued expression; OUTER APPLY acts like a LEFT JOIN returning NULLs if empty", "CROSS APPLY is for dates; OUTER APPLY is for text", "CROSS APPLY works on views only", "They are identical aliases"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(251, 'sql', 'mcq', 'hard', 'Database Design', 'What is a Surrogate Key versus Natural Key trade-off?', '["Surrogate keys provide stable immutable joins insulated from business rule changes; natural keys avoid extra surrogate columns", "Natural keys are always faster than integers", "Surrogate keys cannot have unique constraints", "Natural keys must always be UUIDs"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(252, 'sql', 'mcq', 'hard', 'Performance & Maintenance', 'What is an Index Fragmentation and how does it impact performance?', '["Pages in an index become out of logical sequence or contain excessive empty space, degrading range scan I/O efficiency", "The index is broken and cannot be read", "The table loses its primary key", "The hard drive is failing physically"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(253, 'sql', 'mcq', 'hard', 'Performance & Maintenance', 'How is index fragmentation resolved in PostgreSQL and SQL Server?', '["REINDEX / ALTER INDEX REBUILD or REORGANIZE", "DROP DATABASE", "UPDATE STATISTICS ONLY", "DELETE FROM table"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(254, 'sql', 'mcq', 'hard', 'Query Optimization', 'What are Database Statistics used for by the query planner?', '["Distribution histograms and row count estimates used by the cost-based optimizer to select optimal join algorithms and access paths", "Billing calculations for database users", "Counting how many times users log in", "Network latency reports"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(255, 'sql', 'mcq', 'hard', 'Query Optimization', 'Why can outdated database statistics cause severe query performance degradation?', '["The query optimizer may choose suboptimal execution plans (like nested loops over hash joins) based on inaccurate row estimates", "Outdated statistics crash the database parser", "The server runs out of disk space", "Indexes stop functioning completely"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(256, 'sql', 'mcq', 'hard', 'Join Algorithms', 'What is a Nested Loop Join?', '["A join algorithm that iterates through an outer table and looks up matching rows in an inner table for each outer row", "A loop written in Python", "Joining a table 10 times in a query", "A join inside a stored procedure"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(257, 'sql', 'mcq', 'hard', 'Join Algorithms', 'When is a Nested Loop Join most efficient?', '["When the outer table is small and the inner table has an efficient index on the join key", "When both tables have millions of unsorted rows", "When no indexes exist on either table", "When doing a Cartesian product"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(258, 'sql', 'mcq', 'hard', 'Join Algorithms', 'What is a Hash Join algorithm?', '["Builds a hash table in memory from the smaller input, then probes it with rows from the larger input", "A join on encrypted columns", "A join that uses MD5 hashing for passwords", "A join on B-Trees only"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(259, 'sql', 'mcq', 'hard', 'Join Algorithms', 'When does the query optimizer choose a Hash Join over a Nested Loop?', '["For large, unsorted, unindexed datasets where in-memory hashing outperforms repeated index searches", "For single row lookups by primary key", "For tables with under 5 rows", "When sorting by ORDER BY"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(260, 'sql', 'mcq', 'hard', 'Join Algorithms', 'What is a Merge Join (Sort-Merge Join)?', '["An algorithm that simultaneously scans two inputs that are already sorted on the join keys", "A join that merges two databases", "A full table scan without sorting", "A join inside an INSERT statement"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(261, 'sql', 'mcq', 'hard', 'Join Algorithms', 'What prerequisite is strictly required before a Merge Join can execute?', '["Both input datasets must be sorted on the join keys", "Both tables must be in the same schema", "Both tables must be partitioned", "No NULL values can exist"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(262, 'sql', 'mcq', 'hard', 'Concurrency Anomalies', 'What is a Phantom Read anomaly?', '["A transaction re-executing a search query observes a new row that was committed by another concurrent transaction", "Reading data that was never written", "A corrupted index returning ghost rows", "A query reading deleted data from cache"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(263, 'sql', 'mcq', 'hard', 'Concurrency Anomalies', 'What is Write Skew anomaly in Snapshot Isolation?', '["Two concurrent transactions read overlapping data, perform conflicting updates based on the read, and violate a global constraint without seeing each other''s writes", "Writing to the wrong database disk", "A syntax error in an INSERT query", "Writing data without a transaction"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(264, 'sql', 'mcq', 'hard', 'Concurrency Anomalies', 'How can Write Skew be prevented in databases using Snapshot Isolation?', '["Using SELECT ... FOR UPDATE or upgrading to full Serializable isolation", "Using Read Committed isolation", "Disabling foreign keys", "Using UNION ALL"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(265, 'sql', 'mcq', 'hard', 'Locking & Concurrency', 'What is the purpose of ''SELECT ... FOR UPDATE'' in a transaction?', '["Explicitly places exclusive locks on the selected rows to prevent other transactions from modifying or locking them until commit", "Updates the rows immediately to NULL", "Selects rows from a read replica", "Bypasses all triggers"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(266, 'sql', 'mcq', 'hard', 'Locking & Concurrency', 'What does ''SELECT ... FOR SHARE'' do?', '["Acquires a shared lock on selected rows, allowing concurrent reads while blocking concurrent updates", "Shares the query result with other users", "Creates a public view", "Commits the transaction"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(267, 'sql', 'mcq', 'hard', 'Locking & Concurrency', 'What does the ''NOWAIT'' clause do in ''SELECT ... FOR UPDATE NOWAIT''?', '["Immediately raises an error if the requested rows are already locked by another transaction instead of waiting", "Runs the query in the background", "Disables database locks", "Commits instantly"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(268, 'sql', 'mcq', 'hard', 'Locking & Concurrency', 'What does ''SKIP LOCKED'' do in ''SELECT ... FOR UPDATE SKIP LOCKED''?', '["Skips rows that are currently locked by other transactions, ideal for implementing high-concurrency worker queues", "Skips table validation", "Ignores primary keys", "Removes locked tables"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(269, 'sql', 'mcq', 'hard', 'Architecture & Scaling', 'What is Connection Pooling in database application architecture?', '["Maintaining a cache of active database connections that are reused by applications to avoid expensive connection handshake overhead", "Connecting multiple databases together", "Sharing passwords across pools", "Replicating database transactions"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(270, 'sql', 'mcq', 'hard', 'Architecture & Scaling', 'What is Read Replica in database scaling?', '["A read-only copy of the primary database that asynchronously or synchronously replicates data changes to offload analytical and read traffic", "A temporary test database", "A backup tape drive", "A replica of the application code"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(271, 'sql', 'mcq', 'hard', 'Architecture & Scaling', 'What is Replication Lag?', '["The time delay between a write operation being committed on the primary database and being reflected on the read replica", "The network latency of the web browser", "The query execution time in seconds", "The time to create an index"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(272, 'sql', 'mcq', 'hard', 'Distributed Systems', 'What is Eventual Consistency?', '["A consistency model in distributed systems where all replicas will eventually converge to the same value given sufficient time without updates", "Immediate synchronous consistency across all nodes", "A database without transactions", "A system that never updates data"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(273, 'sql', 'mcq', 'hard', 'Distributed Systems', 'What is the CAP Theorem in distributed databases?', '["A distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance", "Control, Accuracy, and Performance cannot be achieved together", "Calculations, Aggregations, and Projections rule", "Computers Always Panic theorem"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(274, 'sql', 'mcq', 'hard', 'Internal Structures', 'What is Multi-Version Concurrency Control (MVCC)?', '["A database concurrency mechanism where data updates create new row versions rather than overwriting in-place, allowing non-blocking reads", "Running multiple versions of the database engine", "Allowing multiple users to edit the same SQL file", "A git-based database model"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(275, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'In PostgreSQL MVCC, what do xmin and xmax system columns represent?', '["The transaction IDs that inserted (xmin) and deleted/updated (xmax) that particular row version", "The minimum and maximum values of the primary key", "The time limits of the query", "The user IDs of developers"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(276, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is the purpose of VACUUM in PostgreSQL?', '["Reclaims storage occupied by dead row versions (tuples) left behind by updates/deletes and freezes transaction IDs", "Deletes all tables in the database", "Compresses database backups", "Clears the browser cache"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(277, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is Transaction ID Wraparound in PostgreSQL and how is it prevented?', '["A critical condition where 32-bit transaction IDs wrap around, which VACUUM FREEZE prevents by marking older tuples as frozen in the past", "A transaction that runs too many queries", "A loop in a recursive CTE", "A circular foreign key reference"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(278, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is the purpose of the TOAST mechanism in PostgreSQL?', '["The Oversized-Attribute Storage Technique for storing large field values (like big text/JSON) out-of-line in separate compressed chunks", "A caching system for SQL queries", "A backup utility for tables", "A web framework connector"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(279, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is a Generalized Inverted Index (GIN) best suited for in PostgreSQL?', '["Composite items and full-text search, arrays, and JSONB document containment queries (@>)", "Single integer lookups", "Range scans on dates", "Auto-incrementing sequence keys"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(280, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is a GiST (Generalized Search Tree) index best suited for?', '["Geometric and spatial data (PostGIS), nearest neighbor searches, and range types", "Simple text equality", "Unique primary keys", "Boolean columns"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(281, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is a BRIN (Block Range Index) in PostgreSQL?', '["An extremely lightweight index designed for very large tables where physical row location correlates with column order (like timestamps)", "A binary search tree on strings", "A memory-only temporary index", "An index for full-text search"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(282, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is the JSONB data type in PostgreSQL compared to plain JSON?', '["JSONB stores parsed binary representation allowing fast indexed queries and operators, whereas JSON stores exact text", "JSONB is uncompressed text", "JSONB cannot be indexed", "JSONB does not support objects"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(283, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'Which PostgreSQL operator tests if a JSONB document contains a specific top-level key?', '["? (or ?| / ?&)", "CONTAINS()", "HAS_KEY()", "IN_JSON()"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(284, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'Which operator tests if a JSONB document contains another JSONB structure (@>)?', '["@> (Containment operator)", "&& (Overlap operator)", "?? (Key operator)", "== (Exact equality)"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(285, 'sql', 'mcq', 'hard', 'PostgreSQL Internals', 'What is the difference between -> and ->> operators when extracting JSON data?', '["-> returns the value as a JSON/JSONB object; ->> returns the value as text", "-> returns text; ->> returns numbers", "-> extracts keys; ->> extracts arrays", "There is no difference"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(286, 'sql', 'mcq', 'hard', 'Security & RLS', 'What is Row-Level Security (RLS) in modern PostgreSQL/Supabase?', '["Security policies defined on tables that restrict which rows a user can SELECT, INSERT, UPDATE, or DELETE based on session context", "Restricting database access to specific IP rows", "Password hashing on row values", "Encrypting rows with AES"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(287, 'sql', 'mcq', 'hard', 'Security & RLS', 'Which command enables Row-Level Security on a PostgreSQL table?', '["ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;", "SET RLS = TRUE;", "CREATE RLS ON table_name;", "ENABLE SECURITY FOR table_name;"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(288, 'sql', 'mcq', 'hard', 'Security & RLS', 'How does Supabase identify the active authenticated user within PostgreSQL RLS policies?', '["Using the auth.uid() function which extracts the user UUID from the JWT claims", "Using the system username", "Using the client IP address", "Using a database password cookie"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(289, 'sql', 'mcq', 'hard', 'Security & RLS', 'What is the difference between USING and WITH CHECK clauses in an RLS policy?', '["USING controls visibility for existing rows (SELECT/UPDATE/DELETE); WITH CHECK validates new/modified rows on INSERT/UPDATE", "USING is for INSERT; WITH CHECK is for SELECT", "USING is only for administrators", "They are interchangeable synonyms"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(290, 'sql', 'mcq', 'hard', 'Security & RLS', 'What happens if RLS is enabled on a table but NO policies are created for a role?', '["Access is denied by default (default-deny posture) for non-superuser roles", "All rows become public automatically", "An error occurs on table creation", "Only root can access views"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(291, 'sql', 'mcq', 'hard', 'Security & RLS', 'What is a SECURITY DEFINER function in PostgreSQL?', '["A function executed with the privileges of the user who created it, bypassing caller RLS/privileges if specified", "A function that encrypts database passwords", "A function that cannot be modified", "A read-only function"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(292, 'sql', 'mcq', 'hard', 'Security & RLS', 'Why must SECURITY DEFINER functions explicitly set ''search_path = public''?', '["To prevent search_path injection attacks where malicious users create trojan objects in schemas ahead in the search path", "To make the function run 2x faster", "Because PostgreSQL errors without it", "To allow cross-database joins"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(293, 'sql', 'mcq', 'hard', 'Security & Hardening', 'What is a SQL Injection vulnerability?', '["An attack where untrusted user input is concatenated directly into a SQL query string, altering query structure and execution", "A virus injected into database files", "Injecting too many rows into a table", "A hardware memory corruption"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(294, 'sql', 'mcq', 'hard', 'Security & Hardening', 'What is the most effective defense against SQL Injection?', '["Parameterized queries (prepared statements) that treat input strictly as data parameters, never executable code", "Filtering out single quotes with regex", "Using client-side JavaScript validation only", "Hiding database error messages"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(295, 'sql', 'mcq', 'hard', 'Internationalization', 'What is a Collation in SQL?', '["A set of rules that determines how character strings are compared, sorted, and case-evaluated", "A table backup archive", "A database connection limit", "A data compression format"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(296, 'sql', 'mcq', 'hard', 'Data Types', 'What is the difference between VARCHAR and NVARCHAR in SQL Server / Oracle?', '["NVARCHAR stores Unicode characters using UTF-16, supporting international multilingual scripts; VARCHAR stores single-byte characters", "NVARCHAR cannot be indexed", "VARCHAR is unlimited in length", "NVARCHAR is deprecated"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(297, 'sql', 'mcq', 'hard', 'NULL Handling', 'What is the purpose of the SQL COALESCE function in an outer join query?', '["To replace generated NULL values from un-matched outer table rows with meaningful default values", "To force an inner join", "To eliminate duplicate columns", "To sort the output"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(298, 'sql', 'mcq', 'hard', 'Programmability', 'What is a Deterministic Function in SQL?', '["A function that always returns the exact same result given the same input arguments without side effects", "A function that generates random numbers", "A function that updates data", "A function with no parameters"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(299, 'sql', 'mcq', 'hard', 'Indexing & Performance', 'Why can deterministic functions be used in indexed expressions while non-deterministic functions (like NOW()) cannot?', '["Because the indexed value must remain completely consistent with the table row without drifting over time", "Because NOW() is too fast", "Because deterministic functions use no RAM", "Because non-deterministic functions return NULL"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(300, 'sql', 'mcq', 'hard', 'Query Optimization', 'What is a Cost-Based Optimizer (CBO)?', '["A database subsystem that calculates the estimated resource cost (I/O, CPU, memory) for multiple execution paths and picks the cheapest", "A tool for estimating cloud server costs", "A DBA billing tool", "An index defragmenter"]'::jsonb, '0', 6, NULL, NULL, NULL, NULL, NULL, NULL),
(301, 'sql', 'coding', 'easy', 'Select All Customers', 'Select All Customers', NULL, NULL, 3, 'Write a SQL query to retrieve all columns and records from the `customers` table ordered by `customer_id` ascending.', 'customers table with 10 rows', '10 rows returned with all customer fields', 'Standard relational SQL. Return required columns.', '-- Write your SQL query below
SELECT * FROM customers ORDER BY customer_id ASC;', 'SELECT * FROM customers ORDER BY customer_id ASC'),
(302, 'sql', 'coding', 'easy', 'Filter High-Balance Accounts', 'Filter High-Balance Accounts', NULL, NULL, 3, 'Write a SQL query to find all accounts with a `balance` greater than 5000 from the `accounts` table. Order the results by `balance` descending.', 'accounts table with various balances', 'Accounts with balance > 5000 in descending order', 'Standard relational SQL. Return required columns.', 'SELECT account_id, customer_id, account_type, balance FROM accounts WHERE balance > 5000 ORDER BY balance DESC;', 'SELECT account_id, customer_id, account_type, balance FROM accounts WHERE balance > 5000 ORDER BY balance DESC'),
(303, 'sql', 'coding', 'easy', 'Active Customers in New York', 'Active Customers in New York', NULL, NULL, 3, 'Retrieve `customer_id`, `first_name`, `last_name`, and `city` from `customers` who live in ''New York'' and have `kyc_status` equal to ''Verified''.', 'customers table with multiple cities', 'Verified customers living in New York', 'Standard relational SQL. Return required columns.', 'SELECT customer_id, first_name, last_name, city FROM customers WHERE city = ''New York'' AND kyc_status = ''Verified'' ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name, city FROM customers WHERE city = ''New York'' AND kyc_status = ''Verified'' ORDER BY customer_id ASC'),
(304, 'sql', 'coding', 'easy', 'Count Total Branches', 'Count Total Branches', NULL, NULL, 3, 'Write a SQL query to count the total number of bank branches in the `branches` table as `total_branches`.', 'branches table', 'total_branches count', 'Standard relational SQL. Return required columns.', 'SELECT COUNT(*) AS total_branches FROM branches;', 'SELECT COUNT(*) AS total_branches FROM branches'),
(305, 'sql', 'coding', 'easy', 'Highest Credit Score', 'Highest Credit Score', NULL, NULL, 3, 'Find the maximum credit score from the `customers` table and label the column `max_credit_score`.', 'customers table with credit scores', 'max_credit_score value', 'Standard relational SQL. Return required columns.', 'SELECT MAX(credit_score) AS max_credit_score FROM customers;', 'SELECT MAX(credit_score) AS max_credit_score FROM customers'),
(306, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 6)', 'Find Loans Over 20000 (Set 6)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(307, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 7)', 'Count Active Debit Cards (Set 7)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(308, 'sql', 'coding', 'easy', 'Average Account Balance (Set 8)', 'Average Account Balance (Set 8)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(309, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 9)', 'Total Completed Transactions (Set 9)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(310, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 10)', 'Verified Beneficiaries (Set 10)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(311, 'sql', 'coding', 'easy', 'Departments with High Budgets (Set 11)', 'Departments with High Budgets (Set 11)', NULL, NULL, 3, 'Write a SQL query to satisfy: Departments with High Budgets using table `departments`.', 'departments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on departments
SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC;', 'SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC'),
(312, 'sql', 'coding', 'easy', 'Employees in Tech Branch (Set 12)', 'Employees in Tech Branch (Set 12)', NULL, NULL, 3, 'Write a SQL query to satisfy: Employees in Tech Branch using table `employees`.', 'employees table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on employees
SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id;', 'SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id'),
(313, 'sql', 'coding', 'easy', 'Total Loan Repayments Paid (Set 13)', 'Total Loan Repayments Paid (Set 13)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Loan Repayments Paid using table `loan_payments`.', 'loan_payments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loan_payments
SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'';', 'SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'''),
(314, 'sql', 'coding', 'easy', 'Merchants in Retail Category (Set 14)', 'Merchants in Retail Category (Set 14)', NULL, NULL, 3, 'Write a SQL query to satisfy: Merchants in Retail Category using table `merchants`.', 'merchants table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on merchants
SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name;', 'SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name'),
(315, 'sql', 'coding', 'easy', 'Exchange Rates for USD (Set 15)', 'Exchange Rates for USD (Set 15)', NULL, NULL, 3, 'Write a SQL query to satisfy: Exchange Rates for USD using table `exchange_rates`.', 'exchange_rates table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on exchange_rates
SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC;', 'SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC'),
(316, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 16)', 'Find Loans Over 20000 (Set 16)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(317, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 17)', 'Count Active Debit Cards (Set 17)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(318, 'sql', 'coding', 'easy', 'Average Account Balance (Set 18)', 'Average Account Balance (Set 18)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(319, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 19)', 'Total Completed Transactions (Set 19)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(320, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 20)', 'Verified Beneficiaries (Set 20)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(321, 'sql', 'coding', 'easy', 'Departments with High Budgets (Set 21)', 'Departments with High Budgets (Set 21)', NULL, NULL, 3, 'Write a SQL query to satisfy: Departments with High Budgets using table `departments`.', 'departments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on departments
SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC;', 'SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC'),
(322, 'sql', 'coding', 'easy', 'Employees in Tech Branch (Set 22)', 'Employees in Tech Branch (Set 22)', NULL, NULL, 3, 'Write a SQL query to satisfy: Employees in Tech Branch using table `employees`.', 'employees table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on employees
SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id;', 'SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id'),
(323, 'sql', 'coding', 'easy', 'Total Loan Repayments Paid (Set 23)', 'Total Loan Repayments Paid (Set 23)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Loan Repayments Paid using table `loan_payments`.', 'loan_payments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loan_payments
SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'';', 'SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'''),
(324, 'sql', 'coding', 'easy', 'Merchants in Retail Category (Set 24)', 'Merchants in Retail Category (Set 24)', NULL, NULL, 3, 'Write a SQL query to satisfy: Merchants in Retail Category using table `merchants`.', 'merchants table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on merchants
SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name;', 'SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name'),
(325, 'sql', 'coding', 'easy', 'Exchange Rates for USD (Set 25)', 'Exchange Rates for USD (Set 25)', NULL, NULL, 3, 'Write a SQL query to satisfy: Exchange Rates for USD using table `exchange_rates`.', 'exchange_rates table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on exchange_rates
SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC;', 'SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC'),
(326, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 26)', 'Find Loans Over 20000 (Set 26)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(327, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 27)', 'Count Active Debit Cards (Set 27)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(328, 'sql', 'coding', 'easy', 'Average Account Balance (Set 28)', 'Average Account Balance (Set 28)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(329, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 29)', 'Total Completed Transactions (Set 29)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(330, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 30)', 'Verified Beneficiaries (Set 30)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(331, 'sql', 'coding', 'easy', 'Departments with High Budgets (Set 31)', 'Departments with High Budgets (Set 31)', NULL, NULL, 3, 'Write a SQL query to satisfy: Departments with High Budgets using table `departments`.', 'departments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on departments
SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC;', 'SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC'),
(332, 'sql', 'coding', 'easy', 'Employees in Tech Branch (Set 32)', 'Employees in Tech Branch (Set 32)', NULL, NULL, 3, 'Write a SQL query to satisfy: Employees in Tech Branch using table `employees`.', 'employees table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on employees
SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id;', 'SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id'),
(333, 'sql', 'coding', 'easy', 'Total Loan Repayments Paid (Set 33)', 'Total Loan Repayments Paid (Set 33)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Loan Repayments Paid using table `loan_payments`.', 'loan_payments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loan_payments
SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'';', 'SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'''),
(334, 'sql', 'coding', 'easy', 'Merchants in Retail Category (Set 34)', 'Merchants in Retail Category (Set 34)', NULL, NULL, 3, 'Write a SQL query to satisfy: Merchants in Retail Category using table `merchants`.', 'merchants table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on merchants
SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name;', 'SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name'),
(335, 'sql', 'coding', 'easy', 'Exchange Rates for USD (Set 35)', 'Exchange Rates for USD (Set 35)', NULL, NULL, 3, 'Write a SQL query to satisfy: Exchange Rates for USD using table `exchange_rates`.', 'exchange_rates table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on exchange_rates
SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC;', 'SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC'),
(336, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 36)', 'Find Loans Over 20000 (Set 36)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(337, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 37)', 'Count Active Debit Cards (Set 37)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(338, 'sql', 'coding', 'easy', 'Average Account Balance (Set 38)', 'Average Account Balance (Set 38)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(339, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 39)', 'Total Completed Transactions (Set 39)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(340, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 40)', 'Verified Beneficiaries (Set 40)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(341, 'sql', 'coding', 'easy', 'Departments with High Budgets (Set 41)', 'Departments with High Budgets (Set 41)', NULL, NULL, 3, 'Write a SQL query to satisfy: Departments with High Budgets using table `departments`.', 'departments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on departments
SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC;', 'SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC'),
(342, 'sql', 'coding', 'easy', 'Employees in Tech Branch (Set 42)', 'Employees in Tech Branch (Set 42)', NULL, NULL, 3, 'Write a SQL query to satisfy: Employees in Tech Branch using table `employees`.', 'employees table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on employees
SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id;', 'SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id'),
(343, 'sql', 'coding', 'easy', 'Total Loan Repayments Paid (Set 43)', 'Total Loan Repayments Paid (Set 43)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Loan Repayments Paid using table `loan_payments`.', 'loan_payments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loan_payments
SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'';', 'SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'''),
(344, 'sql', 'coding', 'easy', 'Merchants in Retail Category (Set 44)', 'Merchants in Retail Category (Set 44)', NULL, NULL, 3, 'Write a SQL query to satisfy: Merchants in Retail Category using table `merchants`.', 'merchants table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on merchants
SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name;', 'SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name'),
(345, 'sql', 'coding', 'easy', 'Exchange Rates for USD (Set 45)', 'Exchange Rates for USD (Set 45)', NULL, NULL, 3, 'Write a SQL query to satisfy: Exchange Rates for USD using table `exchange_rates`.', 'exchange_rates table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on exchange_rates
SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC;', 'SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC'),
(346, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 46)', 'Find Loans Over 20000 (Set 46)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(347, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 47)', 'Count Active Debit Cards (Set 47)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(348, 'sql', 'coding', 'easy', 'Average Account Balance (Set 48)', 'Average Account Balance (Set 48)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(349, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 49)', 'Total Completed Transactions (Set 49)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(350, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 50)', 'Verified Beneficiaries (Set 50)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(351, 'sql', 'coding', 'easy', 'Departments with High Budgets (Set 51)', 'Departments with High Budgets (Set 51)', NULL, NULL, 3, 'Write a SQL query to satisfy: Departments with High Budgets using table `departments`.', 'departments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on departments
SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC;', 'SELECT department_name, annual_budget FROM departments WHERE annual_budget >= 1000000 ORDER BY annual_budget DESC'),
(352, 'sql', 'coding', 'easy', 'Employees in Tech Branch (Set 52)', 'Employees in Tech Branch (Set 52)', NULL, NULL, 3, 'Write a SQL query to satisfy: Employees in Tech Branch using table `employees`.', 'employees table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on employees
SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id;', 'SELECT employee_id, first_name, last_name, role FROM employees WHERE branch_id = 1 ORDER BY employee_id'),
(353, 'sql', 'coding', 'easy', 'Total Loan Repayments Paid (Set 53)', 'Total Loan Repayments Paid (Set 53)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Loan Repayments Paid using table `loan_payments`.', 'loan_payments table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loan_payments
SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'';', 'SELECT SUM(amount_paid) AS total_repaid FROM loan_payments WHERE status = ''Completed'''),
(354, 'sql', 'coding', 'easy', 'Merchants in Retail Category (Set 54)', 'Merchants in Retail Category (Set 54)', NULL, NULL, 3, 'Write a SQL query to satisfy: Merchants in Retail Category using table `merchants`.', 'merchants table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on merchants
SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name;', 'SELECT merchant_name, city, country FROM merchants WHERE category = ''Retail'' ORDER BY merchant_name'),
(355, 'sql', 'coding', 'easy', 'Exchange Rates for USD (Set 55)', 'Exchange Rates for USD (Set 55)', NULL, NULL, 3, 'Write a SQL query to satisfy: Exchange Rates for USD using table `exchange_rates`.', 'exchange_rates table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on exchange_rates
SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC;', 'SELECT to_currency, rate FROM exchange_rates WHERE from_currency = ''USD'' ORDER BY rate DESC'),
(356, 'sql', 'coding', 'easy', 'Find Loans Over 20000 (Set 56)', 'Find Loans Over 20000 (Set 56)', NULL, NULL, 3, 'Write a SQL query to satisfy: Find Loans Over 20000 using table `loans`.', 'loans table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on loans
SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC;', 'SELECT loan_id, customer_id, loan_amount FROM loans WHERE loan_amount > 20000 ORDER BY loan_amount DESC'),
(357, 'sql', 'coding', 'easy', 'Count Active Debit Cards (Set 57)', 'Count Active Debit Cards (Set 57)', NULL, NULL, 3, 'Write a SQL query to satisfy: Count Active Debit Cards using table `cards`.', 'cards table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on cards
SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'';', 'SELECT COUNT(*) AS active_cards FROM cards WHERE card_type = ''Debit'' AND status = ''Active'''),
(358, 'sql', 'coding', 'easy', 'Average Account Balance (Set 58)', 'Average Account Balance (Set 58)', NULL, NULL, 3, 'Write a SQL query to satisfy: Average Account Balance using table `accounts`.', 'accounts table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on accounts
SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts;', 'SELECT ROUND(AVG(balance), 2) AS avg_balance FROM accounts'),
(359, 'sql', 'coding', 'easy', 'Total Completed Transactions (Set 59)', 'Total Completed Transactions (Set 59)', NULL, NULL, 3, 'Write a SQL query to satisfy: Total Completed Transactions using table `transactions`.', 'transactions table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on transactions
SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'';', 'SELECT COUNT(*) AS completed_txns FROM transactions WHERE status = ''Completed'''),
(360, 'sql', 'coding', 'easy', 'Verified Beneficiaries (Set 60)', 'Verified Beneficiaries (Set 60)', NULL, NULL, 3, 'Write a SQL query to satisfy: Verified Beneficiaries using table `beneficiaries`.', 'beneficiaries table records', 'Filtered / computed query result', 'Standard relational SQL. Return required columns.', '-- Write your query on beneficiaries
SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id;', 'SELECT beneficiary_id, beneficiary_name, bank_name FROM beneficiaries WHERE is_verified = ''Yes'' ORDER BY beneficiary_id'),
(361, 'sql', 'coding', 'medium', 'Customer Total Balances Across Accounts', 'Customer Total Balances Across Accounts', NULL, NULL, 6, 'Write a query to calculate the total balance (`total_balance`) across all accounts for each `customer_id`. Include `customer_id` and sort by `total_balance` descending.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', 'SELECT customer_id, SUM(balance) AS total_balance FROM accounts GROUP BY customer_id ORDER BY total_balance DESC;', 'SELECT customer_id, SUM(balance) AS total_balance FROM accounts GROUP BY customer_id ORDER BY total_balance DESC'),
(362, 'sql', 'coding', 'medium', 'Customer Accounts with Customer Names', 'Customer Accounts with Customer Names', NULL, NULL, 6, 'Perform an INNER JOIN between `customers` and `accounts` to return `customers.first_name`, `customers.last_name`, `accounts.account_number`, and `accounts.balance`. Order by `accounts.balance` descending.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', 'SELECT c.first_name, c.last_name, a.account_number, a.balance FROM customers c INNER JOIN accounts a ON c.customer_id = a.customer_id ORDER BY a.balance DESC;', 'SELECT c.first_name, c.last_name, a.account_number, a.balance FROM customers c INNER JOIN accounts a ON c.customer_id = a.customer_id ORDER BY a.balance DESC'),
(363, 'sql', 'coding', 'medium', 'Branches with More Than 3 Employees', 'Branches with More Than 3 Employees', NULL, NULL, 6, 'Find all `branch_id` values from `employees` that have more than 3 employees. Return `branch_id` and the count as `employee_count` ordered by `employee_count` DESC.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', 'SELECT branch_id, COUNT(*) AS employee_count FROM employees GROUP BY branch_id HAVING COUNT(*) > 3 ORDER BY employee_count DESC;', 'SELECT branch_id, COUNT(*) AS employee_count FROM employees GROUP BY branch_id HAVING COUNT(*) > 3 ORDER BY employee_count DESC'),
(364, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 4)', 'High Volume Transaction Accounts (Tier 4)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(365, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 5)', 'Loans and Customer KYC Details (Tier 5)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(366, 'sql', 'coding', 'medium', 'Department Salaries Breakdown (Tier 6)', 'Department Salaries Breakdown (Tier 6)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Department Salaries Breakdown.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;', 'SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC'),
(367, 'sql', 'coding', 'medium', 'Merchant Transactions by Category (Tier 7)', 'Merchant Transactions by Category (Tier 7)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Merchant Transactions by Category.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC;', 'SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC'),
(368, 'sql', 'coding', 'medium', 'Customers Without Loans (Tier 8)', 'Customers Without Loans (Tier 8)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Customers Without Loans.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC'),
(369, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 9)', 'High Volume Transaction Accounts (Tier 9)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(370, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 10)', 'Loans and Customer KYC Details (Tier 10)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(371, 'sql', 'coding', 'medium', 'Department Salaries Breakdown (Tier 11)', 'Department Salaries Breakdown (Tier 11)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Department Salaries Breakdown.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;', 'SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC'),
(372, 'sql', 'coding', 'medium', 'Merchant Transactions by Category (Tier 12)', 'Merchant Transactions by Category (Tier 12)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Merchant Transactions by Category.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC;', 'SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC'),
(373, 'sql', 'coding', 'medium', 'Customers Without Loans (Tier 13)', 'Customers Without Loans (Tier 13)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Customers Without Loans.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC'),
(374, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 14)', 'High Volume Transaction Accounts (Tier 14)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(375, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 15)', 'Loans and Customer KYC Details (Tier 15)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(376, 'sql', 'coding', 'medium', 'Department Salaries Breakdown (Tier 16)', 'Department Salaries Breakdown (Tier 16)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Department Salaries Breakdown.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;', 'SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC'),
(377, 'sql', 'coding', 'medium', 'Merchant Transactions by Category (Tier 17)', 'Merchant Transactions by Category (Tier 17)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Merchant Transactions by Category.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC;', 'SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC'),
(378, 'sql', 'coding', 'medium', 'Customers Without Loans (Tier 18)', 'Customers Without Loans (Tier 18)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Customers Without Loans.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC'),
(379, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 19)', 'High Volume Transaction Accounts (Tier 19)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(380, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 20)', 'Loans and Customer KYC Details (Tier 20)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(381, 'sql', 'coding', 'medium', 'Department Salaries Breakdown (Tier 21)', 'Department Salaries Breakdown (Tier 21)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Department Salaries Breakdown.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;', 'SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC'),
(382, 'sql', 'coding', 'medium', 'Merchant Transactions by Category (Tier 22)', 'Merchant Transactions by Category (Tier 22)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Merchant Transactions by Category.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC;', 'SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC'),
(383, 'sql', 'coding', 'medium', 'Customers Without Loans (Tier 23)', 'Customers Without Loans (Tier 23)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Customers Without Loans.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC'),
(384, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 24)', 'High Volume Transaction Accounts (Tier 24)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(385, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 25)', 'Loans and Customer KYC Details (Tier 25)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(386, 'sql', 'coding', 'medium', 'Department Salaries Breakdown (Tier 26)', 'Department Salaries Breakdown (Tier 26)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Department Salaries Breakdown.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC;', 'SELECT department, COUNT(*) AS emp_count, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC'),
(387, 'sql', 'coding', 'medium', 'Merchant Transactions by Category (Tier 27)', 'Merchant Transactions by Category (Tier 27)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Merchant Transactions by Category.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC;', 'SELECT m.category, COUNT(p.payment_id) AS payment_count, SUM(p.amount) AS total_spent FROM merchants m JOIN merchant_payments p ON m.merchant_id = p.merchant_id GROUP BY m.category ORDER BY total_spent DESC'),
(388, 'sql', 'coding', 'medium', 'Customers Without Loans (Tier 28)', 'Customers Without Loans (Tier 28)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Customers Without Loans.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC;', 'SELECT customer_id, first_name, last_name FROM customers WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM loans) ORDER BY customer_id ASC'),
(389, 'sql', 'coding', 'medium', 'High Volume Transaction Accounts (Tier 29)', 'High Volume Transaction Accounts (Tier 29)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: High Volume Transaction Accounts.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC;', 'SELECT account_id, COUNT(*) AS txn_count, SUM(amount) AS total_amount FROM transactions GROUP BY account_id HAVING COUNT(*) >= 2 ORDER BY total_amount DESC'),
(390, 'sql', 'coding', 'medium', 'Loans and Customer KYC Details (Tier 30)', 'Loans and Customer KYC Details (Tier 30)', NULL, NULL, 6, 'Write an aggregated or multi-table join SQL query to solve: Loans and Customer KYC Details.', 'Interconnected banking relational tables', 'Aggregated/joined relational result table', 'Standard relational SQL. Use GROUP BY / HAVING / JOIN as required.', '-- Write your medium query below
SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC;', 'SELECT c.customer_id, c.first_name, c.kyc_status, l.loan_amount, l.loan_type FROM customers c JOIN loans l ON c.customer_id = l.customer_id WHERE c.kyc_status = ''Verified'' ORDER BY l.loan_amount DESC'),
(391, 'sql', 'coding', 'hard', 'Rank Customers by Total Wealth', 'Rank Customers by Total Wealth', NULL, NULL, 12, 'Calculate total balances across accounts for each customer. Return `customer_id`, `total_wealth`, and their rank as `wealth_rank` ordered by `wealth_rank` ASC.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', 'SELECT customer_id, SUM(balance) AS total_wealth, RANK() OVER (ORDER BY SUM(balance) DESC) AS wealth_rank FROM accounts GROUP BY customer_id ORDER BY wealth_rank ASC;', 'SELECT customer_id, SUM(balance) AS total_wealth, RANK() OVER (ORDER BY SUM(balance) DESC) AS wealth_rank FROM accounts GROUP BY customer_id ORDER BY wealth_rank ASC'),
(392, 'sql', 'coding', 'hard', 'Department Highest Earner', 'Department Highest Earner', NULL, NULL, 12, 'Find the highest paid employee in each department. Return `department`, `first_name`, `last_name`, and `salary` ordered by `salary` DESC.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', 'SELECT e.department, e.first_name, e.last_name, e.salary FROM employees e WHERE e.salary = (SELECT MAX(e2.salary) FROM employees e2 WHERE e2.department = e.department) ORDER BY e.salary DESC;', 'SELECT e.department, e.first_name, e.last_name, e.salary FROM employees e WHERE e.salary = (SELECT MAX(e2.salary) FROM employees e2 WHERE e2.department = e.department) ORDER BY e.salary DESC'),
(393, 'sql', 'coding', 'hard', 'Customer Full Financial Summary', 'Customer Full Financial Summary', NULL, NULL, 12, 'Write a comprehensive query displaying `customer_id`, `first_name`, total accounts count as `num_accounts`, and total loans count as `num_loans` using correlated subqueries or LEFT JOINs.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', 'SELECT c.customer_id, c.first_name, (SELECT COUNT(*) FROM accounts a WHERE a.customer_id = c.customer_id) AS num_accounts, (SELECT COUNT(*) FROM loans l WHERE l.customer_id = c.customer_id) AS num_loans FROM customers c ORDER BY c.customer_id ASC;', 'SELECT c.customer_id, c.first_name, (SELECT COUNT(*) FROM accounts a WHERE a.customer_id = c.customer_id) AS num_accounts, (SELECT COUNT(*) FROM loans l WHERE l.customer_id = c.customer_id) AS num_loans FROM customers c ORDER BY c.customer_id ASC'),
(394, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 4)', 'Audit Trail Employee Manager Lookup (Advanced 4)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(395, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 5)', 'Loan Default Risk Assessment (Advanced 5)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC'),
(396, 'sql', 'coding', 'hard', 'Top Spenders at Retail Merchants (Advanced 6)', 'Top Spenders at Retail Merchants (Advanced 6)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Top Spenders at Retail Merchants.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC;', 'SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC'),
(397, 'sql', 'coding', 'hard', 'Account Balance Outliers (Advanced 7)', 'Account Balance Outliers (Advanced 7)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Account Balance Outliers.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC;', 'SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC'),
(398, 'sql', 'coding', 'hard', 'Exchange Rate Conversion Simulation (Advanced 8)', 'Exchange Rate Conversion Simulation (Advanced 8)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Exchange Rate Conversion Simulation.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency;', 'SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency'),
(399, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 9)', 'Audit Trail Employee Manager Lookup (Advanced 9)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(400, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 10)', 'Loan Default Risk Assessment (Advanced 10)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC'),
(401, 'sql', 'coding', 'hard', 'Top Spenders at Retail Merchants (Advanced 11)', 'Top Spenders at Retail Merchants (Advanced 11)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Top Spenders at Retail Merchants.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC;', 'SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC'),
(402, 'sql', 'coding', 'hard', 'Account Balance Outliers (Advanced 12)', 'Account Balance Outliers (Advanced 12)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Account Balance Outliers.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC;', 'SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC'),
(403, 'sql', 'coding', 'hard', 'Exchange Rate Conversion Simulation (Advanced 13)', 'Exchange Rate Conversion Simulation (Advanced 13)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Exchange Rate Conversion Simulation.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency;', 'SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency'),
(404, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 14)', 'Audit Trail Employee Manager Lookup (Advanced 14)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(405, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 15)', 'Loan Default Risk Assessment (Advanced 15)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC'),
(406, 'sql', 'coding', 'hard', 'Top Spenders at Retail Merchants (Advanced 16)', 'Top Spenders at Retail Merchants (Advanced 16)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Top Spenders at Retail Merchants.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC;', 'SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC'),
(407, 'sql', 'coding', 'hard', 'Account Balance Outliers (Advanced 17)', 'Account Balance Outliers (Advanced 17)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Account Balance Outliers.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC;', 'SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC'),
(408, 'sql', 'coding', 'hard', 'Exchange Rate Conversion Simulation (Advanced 18)', 'Exchange Rate Conversion Simulation (Advanced 18)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Exchange Rate Conversion Simulation.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency;', 'SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency'),
(409, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 19)', 'Audit Trail Employee Manager Lookup (Advanced 19)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(410, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 20)', 'Loan Default Risk Assessment (Advanced 20)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC'),
(411, 'sql', 'coding', 'hard', 'Top Spenders at Retail Merchants (Advanced 21)', 'Top Spenders at Retail Merchants (Advanced 21)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Top Spenders at Retail Merchants.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC;', 'SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC'),
(412, 'sql', 'coding', 'hard', 'Account Balance Outliers (Advanced 22)', 'Account Balance Outliers (Advanced 22)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Account Balance Outliers.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC;', 'SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC'),
(413, 'sql', 'coding', 'hard', 'Exchange Rate Conversion Simulation (Advanced 23)', 'Exchange Rate Conversion Simulation (Advanced 23)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Exchange Rate Conversion Simulation.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency;', 'SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency'),
(414, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 24)', 'Audit Trail Employee Manager Lookup (Advanced 24)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(415, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 25)', 'Loan Default Risk Assessment (Advanced 25)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC'),
(416, 'sql', 'coding', 'hard', 'Top Spenders at Retail Merchants (Advanced 26)', 'Top Spenders at Retail Merchants (Advanced 26)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Top Spenders at Retail Merchants.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC;', 'SELECT c.customer_id, c.first_name, SUM(mp.amount) AS total_merchant_spent FROM customers c JOIN accounts a ON c.customer_id = a.customer_id JOIN merchant_payments mp ON a.account_id = mp.account_id JOIN merchants m ON mp.merchant_id = m.merchant_id WHERE m.category = ''Retail'' GROUP BY c.customer_id, c.first_name ORDER BY total_merchant_spent DESC'),
(417, 'sql', 'coding', 'hard', 'Account Balance Outliers (Advanced 27)', 'Account Balance Outliers (Advanced 27)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Account Balance Outliers.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC;', 'SELECT account_id, customer_id, balance FROM accounts WHERE balance > (SELECT AVG(balance) * 1.5 FROM accounts) ORDER BY balance DESC'),
(418, 'sql', 'coding', 'hard', 'Exchange Rate Conversion Simulation (Advanced 28)', 'Exchange Rate Conversion Simulation (Advanced 28)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Exchange Rate Conversion Simulation.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency;', 'SELECT a.account_id, a.balance AS balance_usd, er.to_currency, ROUND(a.balance * er.rate, 2) AS converted_balance FROM accounts a CROSS JOIN exchange_rates er WHERE er.from_currency = ''USD'' AND a.account_id <= 5 ORDER BY a.account_id, er.to_currency'),
(419, 'sql', 'coding', 'hard', 'Audit Trail Employee Manager Lookup (Advanced 29)', 'Audit Trail Employee Manager Lookup (Advanced 29)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Audit Trail Employee Manager Lookup.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC;', 'SELECT a.log_id, a.action, e.first_name AS emp_name, m.first_name AS mgr_name FROM audit_logs a JOIN employees e ON a.employee_id = e.employee_id LEFT JOIN employees m ON e.manager_id = m.employee_id ORDER BY a.log_id ASC'),
(420, 'sql', 'coding', 'hard', 'Loan Default Risk Assessment (Advanced 30)', 'Loan Default Risk Assessment (Advanced 30)', NULL, NULL, 12, 'Execute advanced subqueries, conditional CASE, or multi-way analytical joins: Loan Default Risk Assessment.', 'Complex multi-table schema with relational constraints', 'Analytical result set with computed fields and rankings', 'Subqueries, window functions, conditional CASE, or multi-way joins required.', '-- Advanced SQL problem
SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC;', 'SELECT l.loan_id, c.first_name, l.loan_amount, l.interest_rate, CASE WHEN c.credit_score < 650 THEN ''High Risk'' WHEN c.credit_score BETWEEN 650 AND 750 THEN ''Medium Risk'' ELSE ''Low Risk'' END AS risk_tier FROM loans l JOIN customers c ON l.customer_id = c.customer_id ORDER BY l.loan_amount DESC')
ON CONFLICT (id) DO UPDATE SET marks = EXCLUDED.marks, options = EXCLUDED.options, expected_solution = EXCLUDED.expected_solution;
