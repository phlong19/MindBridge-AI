# MindBridge AI — Supabase recovery

This repo did **not** contain the original Supabase DDL, migrations, or a data backup.
The migration in `migrations/20261014000000_rebuild_mindbridge.sql` reconstructs
the four tables from `types/supabase.d.ts` and the application's queries.
It is a **fresh-project schema**, not an exact historical backup.

## 0. Check the old project's available backups FIRST

A Supabase project paused for over a year may be unable to resume in Studio,
but its **Project Overview** may still allow a database backup and Storage
download. If you find a backup, preserve it before making any changes and use
[Supabase's expired-pause restore guide](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)
on a **separate new project**. If the project itself has been deleted, Supabase
says its backups and data are permanently lost. Do not apply this fresh schema
on top of a restored database without first comparing DDL and migrations.

The GitHub code can reconstruct tables and features, **not** historical users'
bookmarks, companions, session transcripts, or database-stored voice rows.
Clerk identity records and Vapi account data are separate services and may
still exist in their original accounts.

## 1. Create a replacement Supabase project

1. Create a **new** project at https://database.new and record its project
   reference, project URL, anon/legacy key, and server-only service-role key.
2. Keep using the **same Clerk instance**, if available. Under Clerk's
   Supabase integration, enable its session tokens' `role: authenticated`
   claim. In the **new** Supabase Dashboard, register Clerk under
   **Authentication → Third-Party Auth** (domain for that Clerk instance).
   See [official Clerk integration instructions](https://supabase.com/docs/guides/auth/third-party/clerk).
   The application sends Clerk session tokens via `auth().getToken()`.
3. Copy `.env.example` to `.env.local`, provide the new Supabase URL/key,
   existing Clerk credentials, Vapi public web token, and the admin Clerk ID.
   Place `SUPABASE_SERVICE_ROLE_KEY` **only** in server-side environment
   settings (never in a `NEXT_PUBLIC_*` variable).
4. Repeat the environment variable changes in the production deployment
   provider (e.g., Vercel), then redeploy **after** the database migration.

> If you create a different Clerk instance, old Clerk user IDs won't match
> new IDs. This matters if an old database backup later becomes available.

## 2. Apply the reconstructed migration

From the repository root, using the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
npx supabase login
npx supabase link --project-ref YOUR_NEW_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`supabase/config.toml` is tracked here, so `supabase init` is not required.
The migration creates:

- `voices`: Vapi voice metadata (IDs and provider IDs are text);
- `companions`: AI tutor metadata and ownership, with UUID primary keys;
- `bookmarks`: per-Clerk-user saved companions;
- `session-history`: lesson history and **private** transcripts;
- Clerk JWT-based row-level-security policies and a read-only homepage RPC
  exposing published **companion** metadata, never transcript contents.

The follow-up seed migration moves the 50 voice catalogue records that were
previously embedded in `app/voices/page.tsx` into `public.voices`. The existing
RLS policy grants anonymous users read access to the full catalogue. It also
adds three clearly marked `[Test]` companions, two bookmarks, and three sample
session histories owned by the test Clerk user supplied for development. A
later seed migration adds six published `[Community]` companion examples for
maths, language, coding, history, economics, and science. These are repeatable
demo fixtures, not recovered historical user data.

If `db push` reports an error, stop and investigate rather than manually
creating more tables in the Dashboard. The SQL intentionally uses the exact
camelCase and hyphenated identifiers in the existing TypeScript types.

## 3. Restore the voices catalogue

A fresh database has no voices. Sign in as `ADMIN_USER_ID`, visit
`/admin/sync-voices`, and supply a current **Vapi dashboard session bearer**
from the dashboard's Voice Library network request. This is a short-lived
WorkOS session credential, not a Vapi private API key; do not commit or share
it. The endpoint is dashboard-internal and may change without notice. The
server action checks the authenticated admin ID and writes with the server-only
`SUPABASE_SERVICE_ROLE_KEY`. No public/ordinary user may write directly to
`voices`.

Recheck that Vapi still lists the voices and ElevenLabs provider IDs used by
your app; voice availability and prices may have changed.

## 4. Text chat and optional learning recaps

Apply `20261014030000_add_learning_recap.sql` before using text chat or recap
generation.
Set the server-only `VAPI_PRIVATE_API_KEY` environment variable in local and
deployed environments. The companion room's **Open text chat** action uses
Vapi's Chat API without opening a microphone session. Text conversations are
saved to that user's private `session-history` row as they go. Vapi's current
usage-based Chat API may require a payment method and a completed purchase.

The app offers a learning recap only after a user-ended voice call of at least
60 seconds with at least two student turns. Vapi analyzes its saved call
transcript only after the user selects **Generate recap**, then the app stores
the result on that user's private session-history row.

## 5. Smoke test before switching traffic

```bash
npm ci
npm run build
npm run dev
```

Check anonymous community browsing, Clerk sign-in, creating a companion, voice
selection, starting/stopping a Vapi call, and saving/reopening a lesson.
With a **second Clerk account**, confirm private companions, bookmarks,
and transcripts from the first account cannot be queried. Confirm the homepage
can display published companion cards without exposing message text.

**Known limits:** No new Supabase project or environment credentials have been
configured by these commits. This migration has not been run against your
Supabase project and cannot replace missing historical data. If a backup is
recovered later, compare its exact database schema and data before migrating.

## 6. Prevent this recurrence

Keep SQL migrations in GitHub. Independently export and safely store periodic
database backups **and** any Supabase Storage bucket objects (database backups
do not contain Storage file bodies), verify restore procedures, and consider a
paid tier if automatic Free Plan pausing would be unacceptable.
