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

If `db push` reports an error, stop and investigate rather than manually
creating more tables in the Dashboard. The SQL intentionally uses the exact
camelCase and hyphenated identifiers in the existing TypeScript types.

## 3. Restore the voices catalogue

A fresh database has no voices. Sign in as `ADMIN_USER_ID`, visit
`/admin/sync-voices`, and supply the appropriate **Vapi private token** in
that admin form to import voice-library metadata. The server action now checks
the authenticated admin ID and writes with a server-only Supabase service-role
key. No public/ordinary user may write directly to `voices`.

Recheck that Vapi still lists the voices and ElevenLabs provider IDs used by
your app; voice availability and prices may have changed.

## 4. Smoke test before switching traffic

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

## 5. Prevent this recurrence

Keep SQL migrations in GitHub. Independently export and safely store periodic
database backups **and** any Supabase Storage bucket objects (database backups
do not contain Storage file bodies), verify restore procedures, and consider a
paid tier if automatic Free Plan pausing would be unacceptable.
