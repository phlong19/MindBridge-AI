import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("./text-chat.ts", import.meta.url), "utf8");

const contextModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL("../conversation-context.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  { exports: contextModule.exports, module: contextModule },
);

function service(saved, options = {}) {
  const rows = [
    {
      data: options.companion ?? {
        id: "companion",
        name: "Tutor",
        author: "learner",
        isPublish: false,
        subject: "maths",
        topic: "Equations",
        style: false,
      },
      error: null,
    },
    {
      data: saved === null ? (options.history ?? []) : saved,
      error: options.historyError ?? null,
    },
    { data: { id: 4 }, error: null },
  ];
  let requestBody = null;
  const queries = [];
  const database = {
    from(table) {
      const response = rows.shift();
      const operations = [["from", table]];
      queries.push(operations);
      const query = {};
      for (const key of [
        "select",
        "eq",
        "update",
        "insert",
        "order",
        "limit",
        "neq",
      ])
        query[key] = (...args) => {
          operations.push([key, ...args]);
          return query;
        };
      query.then = (resolve, reject) =>
        Promise.resolve(response).then(resolve, reject);
      query.single = query.maybeSingle = async () => response;
      return query;
    },
  };
  const testModule = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    {
      module: testModule,
      exports: testModule.exports,
      console,
      process: { env: { VAPI_PRIVATE_API_KEY: "test-only" } },
      fetch: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            id: "next-chat",
            output: [{ role: "assistant", content: "Next answer" }],
          }),
        };
      },
      require(name) {
        if (name === "../supabase" || name === "@/lib/supabase")
          return { createSupabaseClient: () => database };
        if (name === "@clerk/nextjs/server")
          return {
            auth: async () => ({
              userId: options.userId === undefined ? "learner" : options.userId,
            }),
          };
        if (name === "@/constants/message")
          return {
            error: {
              invalidRequest: "Invalid request",
              accessDenied: "Access denied",
              notAuthenticated: "Unauthorized",
              fetchFail: "Fetch failed",
            },
          };
        if (
          name === "@/lib/conversation-context" ||
          name === "../conversation-context"
        )
          return contextModule.exports;
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return {
    ...testModule.exports,
    queries,
    get requestBody() {
      return requestBody;
    },
  };
}

const saved = {
  id: 4,
  interaction_mode: "text",
  ended_by_user: false,
  created_at: "2026-10-15T04:00:00Z",
  messages: JSON.stringify([{ role: "assistant", content: "Previous answer" }]),
  vapi_chat_id: "previous-chat",
};

test("an ended text session cannot be resumed through the server action", async () => {
  const actions = service({ ...saved, ended_by_user: true });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    4,
  );
  assert.ok(result.error);
  assert.equal(actions.requestBody, null);
});

test("a text session without provider context cannot claim to resume", async () => {
  const actions = service({ ...saved, vapi_chat_id: null });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    4,
  );
  assert.ok(result.error);
  assert.equal(actions.requestBody, null);
});

test("resuming an open text session continues its Vapi context", async () => {
  const actions = service(saved);
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    4,
  );
  assert.equal(result.data.sessionId, 4);
  assert.equal(result.data.messages.length, 3);
  assert.equal(actions.requestBody.previousChatId, "previous-chat");
});

test("demo text sessions cannot be resumed or sent to the provider", async () => {
  const actions = service({ ...saved, is_demo: true });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "Real question",
    4,
  );
  assert.equal(result.error, "Access denied");
  assert.equal(actions.requestBody, null);
  const selection = actions.queries[1].find(([op]) => op === "select")[1];
  assert.match(selection, /is_demo/);
});

test("new text chats include private historical turns in chronological order, excluding demos", async () => {
  const actions = service(null, {
    history: [
      {
        id: 9,
        interaction_mode: "text",
        is_demo: true,
        messages: JSON.stringify([{ role: "user", content: "Demo secret" }]),
      },
      {
        id: 8,
        interaction_mode: "text",
        is_demo: false,
        messages: JSON.stringify([
          { role: "user", content: "Recent question" },
          { role: "assistant", content: "Recent answer" },
        ]),
      },
      {
        id: 7,
        interaction_mode: "voice",
        is_demo: false,
        messages: JSON.stringify([
          { role: "assistant", content: "Earlier answer" },
          { role: "user", content: "Earlier question" },
        ]),
      },
    ],
  });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    null,
  );
  assert.equal(result.data.sessionId, 4);
  const modelMessages = actions.requestBody.assistant.model.messages;
  assert.equal(modelMessages[0].role, "system");
  assert.deepEqual(
    modelMessages.slice(1).map(({ content }) => content),
    ["Earlier question", "Earlier answer", "Recent question", "Recent answer"],
  );
  assert.equal(actions.requestBody.previousChatId, undefined);
  assert.deepEqual(
    Array.from(result.data.messages, ({ content }) => content),
    ["New question", "Next answer"],
  );
  const query = actions.queries[1];
  assert.ok(
    query.some(
      ([op, column, value]) =>
        op === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    query.some(
      ([op, column, value]) =>
        op === "eq" && column === "companion_id" && value === "companion",
    ),
  );
  assert.ok(
    query.some(
      ([op, column, value]) =>
        op === "eq" && column === "is_demo" && value === false,
    ),
  );
  assert.ok(query.some(([op, limit]) => op === "limit" && limit === 20));
  assert.deepEqual(
    query
      .filter(([op]) => op === "order")
      .map(([, column, config]) => [column, config.ascending]),
    [
      ["created_at", false],
      ["id", false],
    ],
  );
});

test("new text context stays within the message and character budget and ignores corrupt transcripts", async () => {
  const turns = Array.from({ length: 80 }, (_, index) => ({
    role: "user",
    content: `${index}:` + "x".repeat(500),
  }));
  const actions = service(null, {
    history: [
      { id: 4, interaction_mode: "text", messages: JSON.stringify(turns) },
      { id: 3, interaction_mode: "voice", messages: "not json" },
    ],
  });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "Another question",
    null,
  );
  assert.ok(result.data);
  const context = actions.requestBody.assistant.model.messages.slice(1);
  assert.ok(context.length > 0 && context.length <= 30);
  assert.ok(
    context.reduce((count, turn) => count + turn.content.length, 0) <= 12000,
  );
  assert.equal(context.at(-1).content, turns.at(-1).content);
});

test("resumed sessions use the provider continuation without reloading or duplicating historical context", async () => {
  const actions = service(saved);
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    4,
  );
  assert.ok(result.data);
  assert.equal(actions.requestBody.previousChatId, "previous-chat");
  assert.equal(actions.requestBody.assistant, undefined);
  assert.equal(actions.queries.length, 3);
  assert.ok(
    actions.queries[1].some(
      ([op, column, value]) =>
        op === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    actions.queries[1].some(
      ([op, column, value]) =>
        op === "eq" && column === "companion_id" && value === "companion",
    ),
  );
});

test("history failures abort new text requests before sending partial context", async () => {
  const actions = service(null, {
    historyError: { message: "History offline" },
  });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    null,
  );
  assert.equal(result.error, "Fetch failed");
  assert.equal(result.errorDescription, "History offline");
  assert.equal(actions.requestBody, null);
});

test("signed-out learners cannot read history or send a text request", async () => {
  const actions = service(null, { userId: null });
  const result = await actions.sendCompanionTextMessage(
    "companion",
    "New question",
    null,
  );
  assert.equal(result.error, "Unauthorized");
  assert.equal(actions.queries.length, 0);
  assert.equal(actions.requestBody, null);
});
