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
function setup(initialSession = null, voiceAvailable = true) {
  let now = 1000;
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
  client.start = () => startup.promise;
  const reply = deferred();
  const recapReply = deferred();
  let recapRequests = 0;
  let saves = 0;
  const mocks = {
    react,
    "@/lib/utils": { configureAssistant: () => ({}) },
    "@/lib/vapi.sdk": {
      createVapiClient: () => {
        if (!voiceAvailable) throw new Error("Voice unavailable");
        return client;
      },
    },
    "@/lib/services/sessions-history": {
      saveSessionHistory: async () => {
        saves++;
        return { data: { id: 8 } };
      },
    },
    "@/lib/services/text-chat": {
      sendCompanionTextMessage: () => reply.promise,
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
  };
  function render() {
    cursor = 0;
    effects = [];
    const state = hook(companion, "learner", initialSession);
    effects.forEach((effect) => effect());
    return state;
  }
  render();
  return {
    render,
    client,
    sent,
    startup,
    reply,
    recapReply,
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

test("the header CTA starts a shared Vapi session with the microphone muted", async () => {
  const app = setup();
  await settle();
  const pending = app.render().startConversation();
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

test("the first typed message starts a muted Vapi conversation without history", async () => {
  const app = setup();
  await settle();
  app.render().setDraft("What is a linear equation?");
  const pending = app.render().send();
  assert.equal(app.render().callStatus, "connecting");
  app.client.emit("call-start");
  app.startup.resolve({ id: "first-call" });
  await pending;
  assert.equal(app.render().muted, true);
  assert.equal(app.render().messages[0].content, "What is a linear equation?");
  assert.equal(app.render().draft, "");
  assert.equal(app.sent[0].triggerResponseEnabled, true);
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
  assert.equal(app.render().isNavigationLocked(), true);
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
  const app = setup(null, false);
  await settle();
  app.render().setDraft("Explain algebra");
  const pending = app.render().send();
  app.reply.resolve({
    data: {
      sessionId: 4,
      messages: [
        { role: "user", content: "Explain algebra" },
        { role: "assistant", content: "Let's practice" },
      ],
    },
  });
  await pending;
  await app.render().endText();
  const state = app.render();
  assert.equal(state.messages.length, 2);
  assert.equal(state.textSessionId, null);
  assert.equal(state.completed, true);
  app.dispose();
});

test("the persistent sidebar guard sees pending work before its UI rerenders", async () => {
  const app = setup(null, false);
  await settle();
  app.render().setDraft("Explain algebra");
  const state = app.render();
  assert.equal(state.isNavigationLocked(), false);
  const pending = state.send();
  assert.equal(state.isNavigationLocked(), true);
  app.reply.resolve({
    data: {
      sessionId: 4,
      messages: [{ role: "assistant", content: "Let's practice" }],
    },
  });
  await pending;
  assert.equal(state.isNavigationLocked(), true);
  await app.render().endText();
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
  const pending = app.render().send();
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
