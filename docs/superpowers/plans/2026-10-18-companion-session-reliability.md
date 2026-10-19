# Companion session reliability implementation plan

**Goal:** Keep muted conversations open for the lesson duration, display pending companion replies, and upgrade the obsolete Daily transport.

**Design:** Keep the shared Vapi conversation and its existing maximum lesson duration. Set the silence timeout to the lesson duration, capped at Vapi's supported 3,600 seconds. Track a pending reply separately from transport startup and saving: start it when sending a typed turn or receiving a final learner transcript, and clear it when assistant text arrives or the call ends. Subscribe to speech and status updates so the UI can explain automatic endings. Preserve transcript save retries and make missing schema errors actionable without falling back to duplicate inserts.

**Evidence:** Recent Vapi calls ended with `silence-timed-out` after approximately 40 seconds. Installed Vapi 2.3.8 depends on Daily 0.80.0. The screenshot identifies the absent `vapi_call_id` column; the existing learning recap migration adds this and the other history metadata columns.

**Tech stack:** React 19, Next.js 15, Vapi Web SDK, Supabase, Node's test runner.

- [x] Add regression tests in `useCompanionSession.test.mjs` for pending replies, speech/status subscriptions, silence timeout, and typed first-turn startup without the stock greeting.
- [x] Update `useCompanionSession.ts`, `types/vapi.d.ts`, and `CompanionConversation.tsx` to implement those states and show an accessible companion reply indicator.
- [x] Upgrade `@vapi-ai/web` to its current supported release after checking its public API; retain and verify microphone startup protection.
- [x] Verify the remote history schema. Return actionable migration guidance on save errors without bypassing call identity checks.
- [x] Apply the existing `20261014030000_add_learning_recap.sql` migration. The user explicitly authorized it in a follow-up request; the migration and conversation timeline migration are now recorded and verified in the configured database.
- [x] Run `npm run test:companion` (49 passing), `npx tsc --noEmit`, targeted ESLint, formatting, and dependency tree checks (Vapi 3.0.0 / Daily 0.93.0). Browser audio verification remains outstanding.
