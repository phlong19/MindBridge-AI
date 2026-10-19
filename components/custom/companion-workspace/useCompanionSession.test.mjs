import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const settle = () => new Promise(setImmediate);
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// A small hook driver exercises the real hook with controlled external IO.
// State/ref/effect slots persist between explicit renders, as they do in React.
function setup(
  initialSession = null,
  voiceAvailable = true,
  companionOverrides = {},
  initialConversation = undefined,
  historyError = false,
) {
  let now = Date.parse("2026-10-18T12:00:00Z");
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const slots = [];
  let cursor = 0;
  let effects = [];
  const same = (a, b) =>
    a &&
    b &&
    a.length === b.length &&
    a.every((entry, i) => Object.is(entry, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies))
        slots[index] = { value: callback, dependencies };
      return slots[index].value;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies)) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const client = new EventEmitter();
  let stops = 0;
  client.stop = () => {
    stops++;
  };
  let muted = true;
  const sent = [];
  client.isMuted = () => muted;
  client.setMuted = (value) => {
    muted = value;
  };
  client.send = (message) => {
    sent.push(message);
  };
  const startup = deferred();
  const starts = [];
  client.start = (...args) => {
    starts.push(args);
    return startup.promise;
  };
  const recapReply = deferred();
  let recapRequests = 0;
  let saves = 0;
  const savedSnapshots = [];
  let saveHandler = async () => ({ data: { id: 8 } });
  let historyHandler = async () => ({ data: [], nextCursor: null });
  const timers = new Map();
  let timerId = 0;
  const mocks = {
    react,
    "@/lib/utils": { configureAssistant: () => ({ model: { messages: [] } }) },
    "@/lib/conversation-context": {
      buildConversationContext: (messages) => messages.slice(-30),
    },
    "@/lib/vapi.sdk": {
      createVapiClient: () => {
        if (!voiceAvailable) throw new Error("Voice unavailable");
        return client;
      },
    },
    "@/lib/services/sessions-history": {
      saveSessionHistory: async (...args) => {
        saves++;
        savedSnapshots.push(args);
        return saveHandler(...args);
      },
      getCompanionConversation: (...args) => historyHandler(...args),
    },
    "@/lib/services/text-chat": {
      finishCompanionTextSession: async () => ({ data: true }),
    },
    "@/lib/services/learning-recap": {
      generateLearningRecap: () => {
        recapRequests++;
        return recapReply.promise;
      },
    },
  };
  const modules = {};
  function load(name) {
    if (mocks[name]) return mocks[name];
    if (modules[name]) return modules[name];
    const file =
      name === "hook"
        ? "useCompanionSession.ts"
        : `${name.replace("./", "")}.ts`;
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const testModule = { exports: {} };
    vm.runInNewContext(
      ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText,
      {
        require: load,
        module: testModule,
        exports: testModule.exports,
        console,
        Date: Clock,
        window: {
          addEventListener() {},
          removeEventListener() {},
          setInterval() {
            return 1;
          },
          clearInterval() {},
          setTimeout(callback, delay) {
            timers.set(++timerId, { callback, delay });
            return timerId;
          },
          clearTimeout(id) {
            timers.delete(id);
          },
        },
      },
    );
    modules[name] = testModule.exports;
    return testModule.exports;
  }
  const hook = load("hook").useCompanionSession;
  const companion = {
    id: "companion",
    slug: "voice",
    duration: 10,
    subject: "maths",
    topic: "Algebra",
    style: false,
    isPublish: false,
    ...companionOverrides,
  };
  function render() {
    cursor = 0;
    effects = [];
    const state = hook(
      companion,
      "learner",
      initialSession,
      initialConversation,
      historyError,
    );
    effects.forEach((effect) => effect());
    return state;
  }
  render();
  return {
    render,
    client,
    sent,
    starts,
    startup,
    recapReply,
    savedSnapshots,
    setSaveHandler(handler) {
      saveHandler = handler;
    },
    setHistoryHandler(handler) {
      historyHandler = handler;
    },
    async flushAutosave() {
      for (const [id, timer] of [...timers]) {
        if (timer.delay !== 600) continue;
        timers.delete(id);
        timer.callback();
      }
      await settle();
    },
    async flushResponseTimeout() {
      for (const [id, timer] of [...timers]) {
        if (timer.delay !== 45_000) continue;
        timers.delete(id);
        timer.callback();
      }
      await settle();
    },
    advance(milliseconds) {
      now += milliseconds;
    },
    get stops() {
      return stops;
    },
    get saves() {
      return saves;
    },
    get recapRequests() {
      return recapRequests;
    },
    dispose() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test("a recoverable SDK startup error cannot hide a subsequently active call", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice();
  app.client.emit("error", { type: "audio-observer-setup-error" });
  assert.equal(app.render().callStatus, "connecting");
  app.client.emit("call-start");
  app.startup.resolve({ id: "call" });
  await pending;
  assert.equal(app.render().callStatus, "active");
  app.dispose();
});

test("an explicit muted Vapi session supports typed turns and microphone toggling", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice({ muted: true });
  app.client.emit("call-start");
  app.startup.resolve({ id: "muted-call" });
  await pending;
  assert.equal(app.render().muted, true);
  assert.equal(app.render().callStatus, "active");
  app.render().setDraft("Explain this equation");
  await app.render().send();
  assert.equal(app.sent[0].triggerResponseEnabled, true);
  app.render().toggleMute();
  assert.equal(app.render().muted, false);
  app.dispose();
});

test("a voice session can start with a typed first turn", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("What is a linear equation?");
  const pending = app.render().startVoice({ muted: true, firstMessage: "What is a linear equation?" });
  assert.equal(app.render().callStatus, "connecting");
  app.client.emit("call-start");
  app.startup.resolve({ id: "first-call" });
  await pending;
  assert.equal(app.render().muted, true);
  assert.equal(app.render().messages[0].content, "What is a linear equation?");
  assert.equal(app.render().draft, "");
  assert.equal(app.sent.length, 0);
  assert.equal(app.starts[0][0].model.messages.at(-1).content, "What is a linear equation?");
  app.dispose();
});

test("muted sessions allow lesson-length pauses and subscribe to lifecycle messages", async () => {
  for (const duration of [10, 120]) {
    const app = setup(null, true, { duration });
    await settle();
    const pending = app.render().startVoice({ muted: true });
    const overrides = app.starts[0][0];
    assert.equal(
      overrides.silenceTimeoutSeconds,
      Math.min(duration * 60, 3600),
    );
    assert.ok(overrides.clientMessages.includes("speech-update"));
    assert.ok(overrides.clientMessages.includes("status-update"));
    app.client.emit("call-start");
    app.startup.resolve({ id: "call" });
    await pending;
    app.dispose();
  }
});

test("a typed first turn skips the stock greeting and shows a pending companion reply", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("Explain algebra");
  const pending = app.render().startVoice({ muted: true, firstMessage: "Explain algebra" });
  assert.equal(app.starts[0][0].firstMessageMode, "assistant-speaks-first-with-model-generated-message");
  assert.equal(app.starts[0][0].firstMessage, undefined);
  app.client.emit("call-start-success", { callId: "typed-call" });
  app.startup.resolve({ id: "typed-call" });
  await pending;
  assert.equal(app.render().responsePending, true);
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "partial",
    role: "assistant",
    transcript: "Algebra",
  });
  assert.equal(app.render().responsePending, false);
  assert.equal(app.render().messages.length, 1);
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "Algebra uses variables.",
  });
  app.render().setDraft("Give me an example");
  await app.render().send();
  assert.equal(app.render().responsePending, true);
  app.client.emit("message", {
    type: "speech-update",
    role: "assistant",
    status: "started",
  });
  assert.equal(app.render().responsePending, false);
  assert.equal(app.render().speaking, true);
  app.client.emit("message", {
    type: "speech-update",
    role: "assistant",
    status: "stopped",
  });
  assert.equal(app.render().speaking, false);
  app.dispose();
});

test("a final learner voice turn shows a pending reply until the assistant responds", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice();
  app.client.emit("call-start");
  app.startup.resolve({ id: "voice-call" });
  await pending;
  app.client.emit("speech-start");
  assert.equal(app.render().responsePending, false);
  app.client.emit("speech-end");
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "user",
    transcript: "Can you explain fractions?",
  });
  assert.equal(app.render().responsePending, true);
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "A fraction is part of a whole.",
  });
  assert.equal(app.render().responsePending, false);
  app.dispose();
});

test("automatic call endings clear pending replies and preserve an explanation after saving", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice({ muted: true });
  app.client.emit("call-start");
  app.startup.resolve({ id: "ended-call" });
  await pending;
  app.client.emit("message", {
    type: "status-update",
    status: "ended",
    endedReason: "silence-timed-out",
  });
  app.client.emit("call-end");
  await settle();
  assert.equal(app.render().responsePending, false);
  assert.match(app.render().callEndedMessage, /pause/);
  assert.equal(app.render().callStatus, "idle");
  app.dispose();
});

test("successful SDK startup activates a typed conversation when call-start is missing", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("What is a linear equation?");
  const pending = app.render().startVoice({ muted: true, firstMessage: "What is a linear equation?" });
  app.client.emit("call-start-success", { callId: "joined-call" });
  app.startup.resolve({ id: "joined-call" });
  await pending;

  assert.equal(app.render().callStatus, "active");
  assert.equal(app.render().muted, true);
  assert.equal(app.render().draft, "");
  assert.equal(app.sent.length, 0);
  assert.equal(app.starts[0][0].model.messages.at(-1).content, "What is a linear equation?");
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "Let's work through an example.",
  });
  assert.equal(app.render().messages.length, 2);
  // A delayed listening notification must not reset the conversation or resend.
  app.client.emit("call-start");
  app.client.emit("call-start-success", { callId: "joined-call" });
  assert.equal(app.sent.length, 0);
  assert.equal(app.render().messages.length, 2);
  app.render().endVoice();
  assert.equal(app.stops, 1);
  app.client.emit("call-end");
  await settle();
  assert.equal(app.saves, 1);
  app.dispose();
});

test("SDK startup success after call-start preserves the active conversation", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("Explain algebra");
  const pending = app.render().startVoice({ muted: true, firstMessage: "Explain algebra" });
  app.client.emit("call-start");
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "Let's practice.",
  });
  app.client.emit("call-start-success", { callId: "joined-call" });
  app.startup.resolve({ id: "joined-call" });
  await pending;
  assert.equal(app.render().messages.length, 2);
  assert.equal(app.sent.length, 0);
  app.dispose();
});

test("viewing saved voice history is chronological and does not resume a call", async () => {
  const app = setup();
  const saved = {
    id: 9,
    interaction_mode: "voice",
    ended_by_user: true,
    canResume: false,
    messages: JSON.stringify([
      { role: "assistant", content: "Second" },
      { role: "user", content: "First" },
    ]),
    created_at: "2026-10-15T04:00:00Z",
    learning_recap: null,
  };
  assert.equal(app.render().openSavedSession(saved), true);
  assert.equal(app.render().messages[0].content, "First");
  assert.equal(app.render().callStatus, "idle");
  assert.equal(app.render().completed, true);
  app.dispose();
});

test("only an open text session can be resumed from history", async () => {
  const app = setup();
  const saved = {
    id: 9,
    interaction_mode: "text",
    ended_by_user: false,
    canResume: true,
    messages: "[]",
    created_at: "2026-10-15T04:00:00Z",
    learning_recap: null,
  };
  assert.equal(
    app.render().openSavedSession({ ...saved, ended_by_user: true }, true),
    false,
  );
  assert.equal(app.render().openSavedSession(saved, true), true);
  assert.equal(app.render().textSessionId, 9);
  assert.equal(app.render().isNavigationLocked(), false);
  app.dispose();
});

test("opening history cannot replace an active Vapi session", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice();
  app.client.emit("call-start");
  app.startup.resolve({ id: "call" });
  await pending;
  assert.equal(
    app.render().openSavedSession({
      id: 9,
      interaction_mode: "voice",
      ended_by_user: true,
      canResume: false,
      messages: "[]",
      created_at: "2026-10-15T04:00:00Z",
      learning_recap: null,
    }),
    false,
  );
  assert.equal(app.render().callStatus, "active");
  app.dispose();
});

test("startup completion after unmount stops the initiating client", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice();
  app.dispose();
  app.startup.resolve({ id: "late-call" });
  await pending;
  assert.ok(app.stops >= 2);
});

test("duplicate call-end events produce one transcript save", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice();
  app.client.emit("call-start");
  app.startup.resolve({ id: "call" });
  await pending;
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "user",
    transcript: "Explain algebra",
  });
  app.render().endVoice();
  app.client.emit("call-end");
  app.client.emit("call-end");
  await settle();
  assert.equal(app.saves, 1);
  assert.equal(app.render().completed, true);
  app.dispose();
});

test("ending a text session preserves its visible conversation", async () => {
  const app = setup({
    ...savedSession(4, ""),
    interaction_mode: "text",
    ended_by_user: false,
    canResume: true,
    messages: JSON.stringify([
      { role: "user", content: "Explain algebra" },
      { role: "assistant", content: "Let's practice" },
    ]),
  });
  await app.render().endText();
  const state = app.render();
  assert.equal(state.messages.length, 2);
  assert.equal(state.textSessionId, null);
  assert.equal(state.completed, true);
  app.dispose();
});

test("the sidebar guard locks typed voice sessions until the call is saved", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("Explain algebra");
  const state = app.render();
  assert.equal(state.isNavigationLocked(), false);
  const pending = state.send();
  assert.equal(state.isNavigationLocked(), true);
  app.client.emit("call-start");
  app.startup.resolve({ id: "typed-call" });
  await pending;
  assert.equal(state.isNavigationLocked(), true);
  app.render().endVoice();
  app.client.emit("call-end");
  await settle();
  assert.equal(state.isNavigationLocked(), false);
  app.dispose();
});

async function eligibleCall(app) {
  await settle();
  const pending = app.render().startVoice();
  app.client.emit("call-start");
  app.startup.resolve({ id: "recap-call" });
  await pending;
  for (const transcript of ["Explain algebra", "Let's solve an equation"])
    app.client.emit("message", {
      type: "transcript",
      transcriptType: "final",
      role: "user",
      transcript,
    });
  app.advance(61000);
  app.render().endVoice();
  app.client.emit("call-end");
  await settle();
  assert.equal(app.render().recapSessionId, 8);
}

test("a previous recap cannot start while a new Vapi conversation is connecting", async () => {
  const app = setup();
  await eligibleCall(app);
  app.render().setDraft("A new question");
  const pending = app.render().startVoice({ muted: true, firstMessage: "A new question" });
  await app.render().generateRecap();
  assert.equal(app.recapRequests, 0);
  app.client.emit("call-start");
  await pending;
  assert.equal(app.render().recap, null);
  app.dispose();
});

test("pending recap generation blocks a new voice or text session", async () => {
  const app = setup();
  await eligibleCall(app);
  const pending = app.render().generateRecap();
  app.render().setDraft("A new question");
  assert.equal(await app.render().send(), false);
  await app.render().startVoice();
  assert.equal(app.render().callStatus, "idle");
  app.recapReply.resolve({
    data: {
      summary: "Previous call",
      topicsLearned: [],
      strengths: [],
      tryNext: [],
    },
  });
  await pending;
  assert.equal(app.render().recap.summary, "Previous call");
  app.dispose();
});

function savedSession(id, content, extra = {}) {
  return {
    id,
    interaction_mode: "voice",
    ended_by_user: true,
    canResume: false,
    messages: JSON.stringify([{ role: "user", content }]),
    created_at: `2026-10-${String(id).padStart(2, "0")}T04:00:00Z`,
    learning_recap: null,
    is_demo: false,
    ...extra,
  };
}

test("saved conversations stay stacked when a new call starts and receives messages", async () => {
  const older = savedSession(1, "Old question");
  const latest = savedSession(2, "Previous question");
  const app = setup(
    latest,
    true,
    {},
    { data: [older, latest], nextCursor: null },
  );
  await settle();
  app.render().setDraft("New question");
  const pending = app.render().startVoice({ muted: true, firstMessage: "New question" });
  app.client.emit("call-start");
  app.startup.resolve({ id: "new-call" });
  await pending;
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "New answer",
  });
  const content = app
    .render()
    .conversationSections.flatMap((section) =>
      section.messages.map((message) => message.content),
    );
  assert.deepEqual(Array.from(content), [
    "Old question",
    "Previous question",
    "New question",
    "New answer",
  ]);
  app.render().endVoice();
  app.client.emit("call-end");
  await settle();
  assert.equal(app.render().conversationSections.length, 3);
  assert.equal(app.render().savedSessions.length, 3);
  app.dispose();
});

test("new voice calls include real conversation context and exclude seeded demos", async () => {
  const demo = savedSession(1, "Demo secret", { is_demo: true });
  const real = savedSession(2, "I am learning fractions");
  const app = setup(real, true, {}, { data: [demo, real], nextCursor: null });
  await settle();
  const pending = app.render().startVoice({ muted: true });
  const context = app.starts[0][0].model.messages;
  assert.ok(
    context.some((message) => message.content === "I am learning fractions"),
  );
  assert.ok(!context.some((message) => message.content === "Demo secret"));
  app.client.emit("call-start");
  app.startup.resolve({ id: "context-call" });
  await pending;
  app.dispose();
});

test("older conversation pages prepend without duplicating already loaded sessions", async () => {
  const oldest = savedSession(1, "Oldest");
  const latest = savedSession(2, "Latest");
  const app = setup(
    latest,
    true,
    {},
    {
      data: [latest],
      nextCursor: { createdAt: latest.created_at, id: latest.id },
    },
  );
  app.setHistoryHandler(async () => ({
    data: [oldest, latest],
    nextCursor: null,
  }));
  await app.render().loadOlderHistory();
  assert.deepEqual(
    Array.from(app.render().savedSessions, (session) => session.id),
    [1, 2],
  );
  assert.equal(app.render().hasOlderHistory, false);
  app.dispose();
});

test("live autosaves serialize before final saving and keep the same conversation row", async () => {
  const app = setup();
  await settle();
  const firstSave = deferred();
  app.setSaveHandler(() => firstSave.promise);
  const pending = app.render().startVoice({ muted: true });
  app.client.emit("call-start");
  app.startup.resolve({ id: "persistent-call" });
  await pending;
  app.render().setDraft("Keep this message");
  await app.render().send();
  await app.flushAutosave();
  assert.equal(app.saves, 1);
  assert.equal(app.savedSnapshots[0][6], "persistent-call");
  assert.equal(app.savedSnapshots[0][5], false);
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "Saved answer",
  });
  app.render().endVoice();
  app.client.emit("call-end");
  await settle();
  assert.equal(app.saves, 1);
  app.setSaveHandler(async () => ({ data: { id: 8 } }));
  firstSave.resolve({ data: { id: 8 } });
  await settle();
  await settle();
  assert.equal(app.saves, 2);
  assert.equal(app.savedSnapshots[1][5], true);
  assert.ok(
    JSON.parse(app.savedSnapshots[1][2]).some(
      (message) => message.content === "Saved answer",
    ),
  );
  assert.equal(app.render().savedSessions.length, 1);
  assert.equal(app.render().callStatus, "idle");
  app.dispose();
});

test("failed final saves retain the conversation and can be retried", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startVoice({ muted: true });
  app.client.emit("call-start");
  app.startup.resolve({ id: "retry-call" });
  await pending;
  app.render().setDraft("Keep my question");
  await app.render().send();
  app.setSaveHandler(async () => ({ error: "Temporary database failure" }));
  app.render().endVoice();
  app.client.emit("call-end");
  await settle();
  assert.equal(app.render().unsavedVoice, true);
  assert.equal(
    app.render().conversationSections[0].messages[0].content,
    "Keep my question",
  );
  app.setSaveHandler(async () => ({ data: { id: 8 } }));
  await app.render().retrySave();
  assert.equal(app.render().unsavedVoice, false);
  assert.equal(app.render().savedSessions.length, 1);
  app.dispose();
});

test("unavailable initial history blocks new provider sessions until history can be recovered", async () => {
  const app = setup(null, true, {}, undefined, true);
  await settle();
  app.render().setDraft("Continue our conversation");
  const pending = app.render().send();
  assert.equal(app.starts.length, 0);
  assert.equal(await pending, false);
  assert.equal(await app.render().startVoice({ muted: true }), false);
  assert.equal(app.render().callStatus, "idle");
  app.dispose();
});

test("a delayed older page cannot replace a session refreshed while it was loading", async () => {
  const older = savedSession(1, "Old snapshot");
  const latest = savedSession(2, "Latest");
  const app = setup(
    latest,
    true,
    {},
    {
      data: [latest],
      nextCursor: { createdAt: latest.created_at, id: latest.id },
    },
  );
  const page = deferred();
  app.setHistoryHandler(() => page.promise);
  const loading = app.render().loadOlderHistory();
  app.render().openSavedSession(savedSession(1, "Freshly saved question"));
  page.resolve({ data: [older], nextCursor: null });
  await loading;
  assert.equal(
    JSON.parse(
      app.render().savedSessions.find((session) => session.id === 1).messages,
    )[0].content,
    "Freshly saved question",
  );
  app.dispose();
});

test("ordinary typing starts a muted voice call with the first question already in context", async () => {
  const demo = savedSession(1, "Demo turn", { is_demo: true });
  const app = setup(demo, true, {}, { data: [demo], nextCursor: null });
  await settle();
  app.render().setDraft("Let's practice introductions");
  const pending = app.render().send();
  assert.equal(app.starts.length, 1);
  assert.equal(app.render().callStatus, "connecting");
  assert.equal(app.render().draft, "Let's practice introductions");
  assert.equal(app.starts[0][0].model.messages.at(-1).role, "user");
  assert.equal(app.starts[0][0].model.messages.at(-1).content, "Let's practice introductions");
  assert.equal(app.starts[0][0].firstMessageMode, "assistant-speaks-first-with-model-generated-message");
  app.client.emit("call-start-success", { callId: "typed-call" });
  app.startup.resolve({ id: "typed-call" });
  assert.equal(await pending, true);
  assert.equal(app.sent.length, 0);
  assert.equal(app.render().muted, true);
  assert.equal(app.render().draft, "");
  app.client.emit("message", {
    type: "transcript",
    transcriptType: "final",
    role: "assistant",
    transcript: "Tell me a little about yourself.",
  });
  assert.equal(app.render().conversationSections.length, 2);
  assert.equal(app.render().isNavigationLocked(), true);
  assert.equal(app.render().messages.length, 2);
  app.dispose();
});

test("a failed typed voice startup preserves the draft and prior visible conversation", async () => {
  const previous = savedSession(1, "Existing history");
  const app = setup(previous);
  await settle();
  app.render().setDraft("Please continue");
  const pending = app.render().send();
  app.startup.resolve(null);
  assert.equal(await pending, false);
  assert.equal(app.render().draft, "Please continue");
  assert.equal(app.render().conversationSections.length, 1);
  assert.equal(app.render().messages[0].content, "Existing history");
  app.dispose();
});

test("a missing assistant reply clears thinking and offers a retry", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("Explain algebra");
  const pending = app.render().send();
  app.client.emit("call-start-success", { callId: "silent-call" });
  app.startup.resolve({ id: "silent-call" });
  await pending;
  assert.equal(app.render().responsePending, true);
  await app.flushResponseTimeout();
  assert.equal(app.render().responsePending, false);
  assert.match(app.render().error, /has not responded/);
  assert.equal(app.render().messages[0].content, "Explain algebra");
  app.render().setDraft("Please answer");
  await app.render().send();
  assert.equal(app.render().responsePending, true);
  assert.equal(app.render().error, null);
  assert.equal(app.sent[0].message.content, "Please answer");
  app.dispose();
});
