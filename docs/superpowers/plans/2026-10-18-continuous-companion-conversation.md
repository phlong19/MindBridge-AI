# Continuous companion conversation implementation plan

**Goal:** Each signed-in learner sees one chronological conversation per companion, with saved sessions retained and new messages appended.

**Architecture:** Retain private session rows as the durable units for call identities, resumes, and recaps. Load them into a paginated timeline and display the current session below saved sessions. Persist active voice snapshots serially with call-identity upserts; final saves use the same row. Pass bounded recent non-demo context into new Vapi sessions. Demo histories remain visible with a label and never contribute to model memory.

**Tech stack:** Next.js 15, React 19, Vapi Web 3, Supabase Postgres, Node tests.

- [x] Migrate the configured database: apply missing history metadata, add demo markers, normalize known demo transcript order, and enforce unique call identities. Verify schema, migration ledger, and seed counts.
- [x] Implement authenticated cursor pagination and idempotent live transcript updates, plus bounded historical context for new text chats.
- [x] Load conversation history on the companion route; append current messages without replacing older saved sessions. Add older-history loading and demo/session labels.
- [x] Persist live voice messages with serialized writes and retain final-save retry behavior. Preserve history across new calls, text sessions, and reloads.
- [x] Supply recent non-demo messages as Vapi context for new voice calls. Keep the typing indicator, muted startup, lesson timeout, and existing recap behavior.
- [x] Exercise stacking, pagination, demo exclusion, live/final save ordering, retry behavior, stale page responses, and privacy in regression tests.
- [ ] Run companion tests, type checking, lint, formatting, and suitable browser/build checks; report evidence and remaining limits.

User approval includes implementation and applying the migrations, given explicitly on October 18, 2026. No further permission is needed for those actions.
