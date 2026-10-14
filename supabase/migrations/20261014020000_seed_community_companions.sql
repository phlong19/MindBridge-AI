-- Add repeatable published community examples for local/demo browsing.
-- The companion slug is the Vapi voice-library ID consumed by configureAssistant.

update public.companions
set slug = case id
  when '02000000-0000-4000-8000-000000000001'::uuid then 'bIHbv24MWmeRgasZH58o'
  when '02000000-0000-4000-8000-000000000002'::uuid then 'rECOLXj3kZIXXxR3SBqN'
  when '02000000-0000-4000-8000-000000000003'::uuid then '8N2ng9i2uiUWqstgmWlH'
end
where id in (
  '02000000-0000-4000-8000-000000000001'::uuid,
  '02000000-0000-4000-8000-000000000002'::uuid,
  '02000000-0000-4000-8000-000000000003'::uuid
);

insert into public.companions (
  id, created_at, author, name, subject, topic, duration, gender, style,
  slug, "photoUrl", "isPublish", "voiceId"
)
values
  (
    '03000000-0000-4000-8000-000000000001', now() - interval '6 hours',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] Fractions Made Simple',
    'maths', 'Fractions, ratios, and equivalent values', 20, false, false,
    'bIHbv24MWmeRgasZH58o', null, true,
    '849bf79c-1d04-4791-bc0b-fea6416762dc'
  ),
  (
    '03000000-0000-4000-8000-000000000002', now() - interval '5 hours',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] Everyday English',
    'language', 'Practice introductions, follow-up questions, and natural replies', 15, true, true,
    'rECOLXj3kZIXXxR3SBqN', null, true,
    'f794a0d7-b5b8-4afd-845e-ecfffc113b85'
  ),
  (
    '03000000-0000-4000-8000-000000000003', now() - interval '4 hours',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] Python First Steps',
    'coding', 'Variables, conditions, and small Python programs', 25, false, false,
    'bIHbv24MWmeRgasZH58o', null, true,
    '849bf79c-1d04-4791-bc0b-fea6416762dc'
  ),
  (
    '03000000-0000-4000-8000-000000000004', now() - interval '3 hours',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] A Walk Along the Silk Road',
    'history', 'Trade, ideas, and travel across the Silk Road', 20, true, true,
    '8N2ng9i2uiUWqstgmWlH', null, true,
    '44e6d34b-ead5-4a6f-a144-833834fa0c09'
  ),
  (
    '03000000-0000-4000-8000-000000000005', now() - interval '2 hours',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] Economics Around Us',
    'economics', 'Supply, demand, and everyday buying decisions', 20, false, true,
    'rECOLXj3kZIXXxR3SBqN', null, true,
    'f794a0d7-b5b8-4afd-845e-ecfffc113b85'
  ),
  (
    '03000000-0000-4000-8000-000000000006', now() - interval '1 hour',
    'user_3KfyuKToQ4E6FMCO7zEiFQbxQyn', '[Community] Ecosystems and Food Webs',
    'science', 'How energy moves through ecosystems and food webs', 25, true, false,
    '8N2ng9i2uiUWqstgmWlH', null, true,
    '44e6d34b-ead5-4a6f-a144-833834fa0c09'
  )
on conflict (id) do update set
  author = excluded.author,
  name = excluded.name,
  subject = excluded.subject,
  topic = excluded.topic,
  duration = excluded.duration,
  gender = excluded.gender,
  style = excluded.style,
  slug = excluded.slug,
  "photoUrl" = excluded."photoUrl",
  "isPublish" = excluded."isPublish",
  "voiceId" = excluded."voiceId";
