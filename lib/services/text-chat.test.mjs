import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("./text-chat.ts", import.meta.url), "utf8");

function service(saved) {
  const rows = [
    {
      data: {
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
    { data: saved, error: null },
    { data: { id: 4 }, error: null },
  ];
  let requestBody = null;
  const database = {
    from() {
      const response = rows.shift();
      const query = {};
      for (const key of ["select", "eq", "update", "insert"])
        query[key] = () => query;
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
          return { auth: async () => ({ userId: "learner" }) };
        if (name === "@/constants/message")
          return {
            error: {
              invalidRequest: "Invalid request",
              accessDenied: "Access denied",
            },
          };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return {
    ...testModule.exports,
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
