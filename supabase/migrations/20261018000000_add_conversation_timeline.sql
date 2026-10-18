-- Distinguish the original development fixtures from real saved conversations.
alter table public."session-history"
  add column is_demo boolean not null default false;

comment on column public."session-history".is_demo is
  'True only for explicitly identified demo transcripts; real conversations default to false.';

-- A full unique index lets PostgREST infer the conflict target for call-save
-- retries. PostgreSQL permits multiple null call IDs for text/legacy sessions.
-- If non-null duplicates exist, fail without deleting or merging transcripts.
create unique index session_history_user_companion_call_unique
  on public."session-history" (user_id, companion_id, vapi_call_id);

-- Match the exact original seed user, companion IDs, and complete transcripts.
-- Never classify subsequent conversations with these companions as demos.
-- The seed stored chronological voice turns; the voice client stores newest
-- first, so reverse only those exact fixture arrays while marking them.
with fixtures (companion_id, messages) as (
  values
    ('02000000-0000-4000-8000-000000000001'::uuid,
     '[{"role":"assistant","content":"Let’s solve a linear equation one step at a time."},{"role":"user","content":"How do I isolate x?"},{"role":"assistant","content":"Undo addition and subtraction first, then undo multiplication and division."}]'),
    ('02000000-0000-4000-8000-000000000002'::uuid,
     '[{"role":"assistant","content":"Let’s practice introducing yourself in English."},{"role":"user","content":"I want to sound more natural."},{"role":"assistant","content":"Try a short introduction, then add one detail about your interests."}]'),
    ('02000000-0000-4000-8000-000000000003'::uuid,
     '[{"role":"assistant","content":"Let’s make a short study plan for the week."},{"role":"user","content":"I have a science test on Friday."},{"role":"assistant","content":"We can divide the topics into three short review sessions."}]')
)
update public."session-history" as history
set is_demo = true,
    messages = (
      select jsonb_agg(turn.value order by turn.ordinality desc)::text
      from jsonb_array_elements(fixtures.messages::jsonb)
        with ordinality as turn(value, ordinality)
    )
from fixtures
where history.user_id = 'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn'
  and history.companion_id = fixtures.companion_id
  and history.messages = fixtures.messages;
