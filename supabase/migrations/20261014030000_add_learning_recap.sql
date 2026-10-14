alter table public."session-history"
  add column duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0),
  add column ended_by_user boolean not null default false,
  add column vapi_call_id text,
  add column learning_recap jsonb,
  add column vapi_chat_id text,
  add column interaction_mode text not null default 'voice'
    check (interaction_mode in ('voice', 'text'));

comment on column public."session-history".duration_seconds is
  'Duration of the completed voice call in seconds.';
comment on column public."session-history".learning_recap is
  'Optional learning recap generated only after the user requests one.';
comment on column public."session-history".vapi_call_id is
  'Vapi call identifier used for requested post-call analysis.';
comment on column public."session-history".vapi_chat_id is
  'Vapi chat identifier used to continue a text session.';
comment on column public."session-history".ended_by_user is
  'Whether the user explicitly ended the voice or text session.';
comment on column public."session-history".interaction_mode is
  'Whether the saved companion session used voice or text chat.';
