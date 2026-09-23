-- EDMITH SQL assessment schema/migration. Non-destructive.
-- Run in Supabase SQL Editor in this order.

-- 1) Create/reuse the existing attempt table, then add the new level column.
create table if not exists public.sql_exam_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    exam_type text not null,
    exam_level text,
    total_questions integer not null check (total_questions > 0),
    correct_answers integer not null check (correct_answers >= 0),
    incorrect_answers integer not null check (incorrect_answers >= 0),
    unanswered integer not null check (unanswered >= 0),
    score integer not null check (score >= 0),
    percentage numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
    rating text not null check (rating in ('Excellent','Good','Average','Below Average')),
    started_at timestamptz not null,
    completed_at timestamptz not null,
    time_taken integer check (time_taken >= 0),
    created_at timestamptz not null default now(),
    constraint sql_exam_attempts_counts_check check (correct_answers + incorrect_answers + unanswered = total_questions),
    constraint sql_exam_attempts_score_check check (score = correct_answers)
);

alter table public.sql_exam_attempts
    add column if not exists exam_level text;

-- Existing rows may have NULL exam_level because this is a safe migration. New frontend inserts always provide it.
-- Optional one-time backfill for historical SQL Basics rows, if all old rows were SQL Basics attempts:
-- update public.sql_exam_attempts set exam_level = 'easy' where exam_type in ('sql_basics','sql-basics') and exam_level is null;
-- Do NOT run that backfill unless you know the historical level.

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'sql_exam_attempts_exam_level_check'
          and conrelid = 'public.sql_exam_attempts'::regclass
    ) then
        alter table public.sql_exam_attempts
            add constraint sql_exam_attempts_exam_level_check
            check (exam_level is null or exam_level in ('easy','medium','hard'));
    end if;
end $$;

create table if not exists public.sql_exam_answers (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.sql_exam_attempts(id) on delete cascade,
    question_id integer not null check (question_id between 1 and 100),
    selected_answer text,
    correct_answer text,
    is_correct boolean not null default false,
    is_unanswered boolean not null default false,
    time_taken integer not null default 0 check (time_taken >= 0),
    created_at timestamptz not null default now(),
    constraint sql_exam_answers_answer_state_check check (not (is_correct and is_unanswered)),
    constraint sql_exam_answers_selected_check check ((is_unanswered and selected_answer is null) or (not is_unanswered and selected_answer is not null))
);

create index if not exists idx_sql_exam_attempts_user_level_completed on public.sql_exam_attempts(user_id, exam_type, exam_level, completed_at desc);
create index if not exists idx_sql_exam_attempts_leaderboard on public.sql_exam_attempts(exam_type, exam_level, percentage desc, score desc, completed_at asc);
create index if not exists idx_sql_exam_answers_attempt on public.sql_exam_answers(attempt_id);
create unique index if not exists uq_sql_exam_answer_per_attempt_question on public.sql_exam_answers(attempt_id, question_id);

alter table public.sql_exam_attempts enable row level security;
alter table public.sql_exam_answers enable row level security;

drop policy if exists "Users can view own SQL exam attempts" on public.sql_exam_attempts;
create policy "Users can view own SQL exam attempts" on public.sql_exam_attempts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own SQL exam attempts" on public.sql_exam_attempts;
create policy "Users can insert own SQL exam attempts" on public.sql_exam_attempts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can view own SQL exam answers" on public.sql_exam_answers;
create policy "Users can view own SQL exam answers" on public.sql_exam_answers for select to authenticated using (exists (select 1 from public.sql_exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
drop policy if exists "Users can insert answers for own SQL attempts" on public.sql_exam_answers;
create policy "Users can insert answers for own SQL attempts" on public.sql_exam_answers for insert to authenticated with check (exists (select 1 from public.sql_exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- 2) Dynamic leaderboard RPC. It returns the best completed attempt per user+level.
create or replace function public.get_sql_exam_leaderboard(
    p_exam_type text default 'sql_basics',
    p_exam_level text default null,
    p_limit integer default 100
)
returns table (
    rank bigint,
    user_id uuid,
    display_name text,
    exam_type text,
    exam_level text,
    score integer,
    total_questions integer,
    percentage numeric,
    rating text,
    completed_at timestamptz,
    attempt_count bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
    with completed as (
        select a.*,
               row_number() over (
                   partition by a.user_id, a.exam_level
                   order by a.percentage desc, a.score desc, a.completed_at asc
               ) as best_for_level
        from public.sql_exam_attempts a
        where a.exam_type in (p_exam_type, case when p_exam_type = 'sql_basics' then 'sql-basics' else p_exam_type end)
          and a.exam_level is not null
          and (p_exam_level is null or a.exam_level = p_exam_level)
          and a.completed_at is not null
    ), best as (
        select c.* from completed c where c.best_for_level = 1
    ), named as (
        select b.*,
               coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), nullif(u.username_display, ''), nullif(u.username, ''), 'EDMITH User') as display_name,
               count(*) over (partition by b.user_id, b.exam_level) as attempt_count_dummy
        from best b
        left join public.users u on lower(u.email) = lower((select au.email from auth.users au where au.id = b.user_id))
    ), ranked as (
        select n.*,
               dense_rank() over (order by n.percentage desc, n.score desc, n.completed_at asc) as calculated_rank,
               (select count(*) from public.sql_exam_attempts x where x.user_id = n.user_id and x.exam_type in (p_exam_type, case when p_exam_type = 'sql_basics' then 'sql-basics' else p_exam_type end) and x.exam_level = n.exam_level and x.completed_at is not null) as real_attempt_count
        from named n
    )
    select calculated_rank, user_id, display_name, exam_type, exam_level, score, total_questions, percentage, rating, completed_at, real_attempt_count
    from ranked
    order by calculated_rank, completed_at asc
    limit greatest(1, least(coalesce(p_limit,100), 500));
$$;

-- 3) Current user's position. Zero scores remain valid rows; no score filter is applied.
create or replace function public.get_sql_exam_user_position(
    p_exam_type text default 'sql_basics',
    p_exam_level text default null
)
returns table (
    rank bigint,
    user_id uuid,
    display_name text,
    exam_level text,
    score integer,
    total_questions integer,
    percentage numeric,
    rating text,
    completed_at timestamptz,
    attempt_count bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
    with best as (
        select *
        from public.get_sql_exam_leaderboard(p_exam_type, p_exam_level, 500)
    ),
    collapsed_base as (
        select distinct on (user_id) *
        from best
        where p_exam_level is null
        order by user_id, percentage desc, score desc, completed_at asc
    ),
    collapsed as (
        select cb.*, dense_rank() over (order by cb.percentage desc, cb.score desc, cb.completed_at asc) as overall_rank
        from collapsed_base cb
    )
    select b.rank, b.user_id, b.display_name, b.exam_level, b.score, b.total_questions, b.percentage, b.rating, b.completed_at, b.attempt_count
    from (
        select rank, user_id, display_name, exam_level, score, total_questions, percentage, rating, completed_at, attempt_count from best where p_exam_level is not null
        union all
        select overall_rank, user_id, display_name, exam_level, score, total_questions, percentage, rating, completed_at, attempt_count from collapsed
    ) b
    where b.user_id = auth.uid()
    order by b.rank, b.completed_at asc
    limit 1;
$$;

revoke all on function public.get_sql_exam_leaderboard(text,text,integer) from public;
grant execute on function public.get_sql_exam_leaderboard(text,text,integer) to authenticated;
revoke all on function public.get_sql_exam_user_position(text,text) from public;
grant execute on function public.get_sql_exam_user_position(text,text) to authenticated;
