import assert from "node:assert/strict";
import { test } from "node:test";

test("legacy voice transcripts display chronologically without modifying storage", async () => {
  const { parseSessionMessages } = await import("./session-messages.ts");
  const newest = { role: "assistant", content: "Two" };
  const oldest = { role: "user", content: "One" };
  assert.deepEqual(
    parseSessionMessages(JSON.stringify([newest, oldest]), "voice"),
    [oldest, newest],
  );
});

test("remaining call time uses elapsed wall time and clamps expired calls", async () => {
  const { remainingCallSeconds } = await import("./session-messages.ts");
  assert.equal(remainingCallSeconds(null, 60, 5000), 60);
  assert.equal(remainingCallSeconds(1000, 60, 16000), 45);
  assert.equal(remainingCallSeconds(1000, 60, 62000), 0);
  assert.equal(remainingCallSeconds(5000, 60, 1000), 60);
});

test("text history retains order and ignores invalid or system messages", async () => {
  const { parseSessionMessages } = await import("./session-messages.ts");
  const valid = [
    { role: "user", content: "One" },
    { role: "assistant", content: "Two" },
  ];
  assert.deepEqual(
    parseSessionMessages(
      JSON.stringify([
        valid[0],
        null,
        { role: "system", content: "hidden" },
        { role: "user", content: 4 },
        valid[1],
      ]),
      "text",
    ),
    valid,
  );
  assert.deepEqual(parseSessionMessages("{broken", "voice"), []);
  assert.deepEqual(parseSessionMessages("{}", "text"), []);
});

test("only an open text session with provider context can resume", async () => {
  const { resumableTextSessionId } = await import("./session-messages.ts");
  const session = {
    id: 7,
    interaction_mode: "text",
    ended_by_user: false,
    canResume: true,
  };
  assert.equal(resumableTextSessionId(session), 7);
  assert.equal(
    resumableTextSessionId({ ...session, ended_by_user: true }),
    null,
  );
  assert.equal(resumableTextSessionId({ ...session, canResume: false }), null);
  assert.equal(
    resumableTextSessionId({ ...session, interaction_mode: "voice" }),
    null,
  );
  assert.equal(resumableTextSessionId(null), null);
});

test("recap eligibility requires a user-ended minute-long call and two learner turns", async () => {
  const { canOfferRecap } = await import("./session-messages.ts");
  const call = {
    durationSeconds: 60,
    endedByUser: true,
    callId: "call",
    messages: [
      { role: "user", content: "One" },
      { role: "user", content: "Two" },
    ],
  };
  assert.equal(canOfferRecap(call), true);
  assert.equal(canOfferRecap({ ...call, durationSeconds: 59 }), false);
  assert.equal(canOfferRecap({ ...call, endedByUser: false }), false);
  assert.equal(canOfferRecap({ ...call, callId: null }), false);
  assert.equal(
    canOfferRecap({ ...call, messages: call.messages.slice(0, 1) }),
    false,
  );
});

test("voice completion captures the call ID and can only be consumed once", async () => {
  const { VoiceSession } = await import("./voice-session.ts");
  const call = new VoiceSession();
  call.callId = "call-before-start";
  call.begin(1000);
  call.addTranscript({ role: "user", content: "Hello" });
  const completed = call.finish(true, 62000);
  assert.equal(completed.callId, "call-before-start");
  assert.equal(completed.durationSeconds, 61);
  assert.equal(call.finish(true, 63000), null);
  call.begin(64000);
  assert.deepEqual(call.messages, []);
});

test("typed input is saved once when echoed by final voice transcripts", async () => {
  const { VoiceSession } = await import("./voice-session.ts");
  const call = new VoiceSession();
  call.begin(1000);
  call.addTypedMessage("Explain this");
  call.addTranscript({ role: "user", content: "Explain this" });
  call.addTranscript({ role: "assistant", content: "Of course" });
  assert.deepEqual(call.messages, [
    { role: "assistant", content: "Of course" },
    { role: "user", content: "Explain this" },
  ]);
});
