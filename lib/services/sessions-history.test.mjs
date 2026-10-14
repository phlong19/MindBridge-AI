import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  process.env.SESSION_HISTORY_TEST_SOURCE ??
    new URL("./sessions-history.ts", import.meta.url),
  "utf8",
);

// The service's external authentication/database boundaries are replaced;
// the actual server-action implementation runs in each test.
function service(responses, authenticatedUser = "learner") {
  const queries = [];
  const database = {
    from(table) {
      const response = responses.shift();
      const operations = [["from", table]];
      queries.push(operations);
      const query = {};
      for (const operation of [
        "select",
        "eq",
        "order",
        "limit",
        "insert",
        "range",
      ]) {
        query[operation] = (...args) => {
          operations.push([operation, ...args]);
          return query;
        };
      }
      query.single = query.maybeSingle = async () =>
        typeof response === "function" ? response(operations) : response;
      query.then = (resolve, reject) =>
        Promise.resolve(
          typeof response === "function" ? response(operations) : response,
        ).then(resolve, reject);
      return query;
    },
  };
  const testModule = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports: testModule.exports,
      module: testModule,
      console,
      require(name) {
        if (name === "../supabase")
          return { createSupabaseClient: () => database };
        if (name === "@clerk/nextjs/server")
          return { auth: async () => ({ userId: authenticatedUser }) };
        if (name === "@/constants/message")
          return {
            error: {
              notAuthorized: "Unauthorized",
              notAuthenticated: "Unauthorized",
              invalidRequest: "Invalid request",
              sessionHistorySaveFail: "Save failed",
              fetchFail: "Fetch failed",
            },
          };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return { ...testModule.exports, queries };
}

test("save retry reuses the existing learner call instead of inserting", async () => {
  const actions = service([{ data: { id: 41 }, error: null }]);
  const result = await actions.saveSessionHistory(
    "companion",
    false,
    "[]",
    "learner",
    60,
    true,
    "call-1",
  );
  assert.equal(result.data?.id, 41);
  assert.equal(
    actions.queries.flat().some(([operation]) => operation === "insert"),
    false,
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "vapi_call_id" && value === "call-1",
    ),
  );
});

test("no previous session is an ordinary empty result", async () => {
  const actions = service([{ data: null, error: null }]);
  const result = await actions.getLastUserSession("companion", "learner");
  assert.equal(result.data, null);
  assert.equal(result.error, undefined);
});

function legacyHistoryResponse(data) {
  return (operations) => {
    const columns = operations.find(([operation]) => operation === "select")[1];
    const missingColumn = [
      "learning_recap",
      "interaction_mode",
      "duration_seconds",
      "vapi_chat_id",
    ].find((column) => columns.includes(column));
    if (missingColumn)
      return {
        data: null,
        error: {
          code: "42703",
          message: `column session-history.${missingColumn} does not exist`,
        },
      };
    return { data, error: null };
  };
}

test("an empty legacy history table does not produce a loading error", async () => {
  const actions = service([legacyHistoryResponse(null)]);
  const result = await actions.getLastUserSession("companion", "learner");
  assert.equal(result.error, undefined);
  assert.equal(result.data, null);
});

test("latest history can load a legacy voice transcript without optional columns", async () => {
  const actions = service([
    legacyHistoryResponse({ id: 5, user_id: "learner", messages: "[]" }),
  ]);
  const result = await actions.getLastUserSession("companion", "learner");
  assert.equal(result.error, undefined);
  assert.equal(result.data?.id, 5);
  assert.equal(result.data?.interaction_mode, "voice");
  assert.equal(result.data?.learning_recap, null);
});

test("a real latest-history database failure is still returned as an error", async () => {
  const actions = service([
    { data: null, error: { code: "08006", message: "Connection failed" } },
  ]);
  const result = await actions.getLastUserSession("companion", "learner");
  assert.equal(result.error, "Fetch failed");
  assert.equal(result.errorDescription, "Connection failed");
});

test("session list is private, paginated, and strips provider identifiers", async () => {
  const actions = service([
    {
      data: [
        {
          id: 1,
          interaction_mode: "text",
          created_at: "2026-10-15T04:00:00Z",
          duration_seconds: 30,
          ended_by_user: false,
          vapi_chat_id: "private-chat-id",
        },
      ],
      count: 21,
      error: null,
    },
  ]);
  const result = await actions.getCompanionSessions("companion", 2);
  assert.equal(result.count, 21);
  assert.equal(result.data[0].canResume, true);
  assert.equal(result.data[0].vapi_chat_id, undefined);
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" &&
        column === "companion_id" &&
        value === "companion",
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, from, to]) =>
        operation === "range" && from === 20 && to === 39,
    ),
  );
});

test("the history modal receives an empty list from a legacy table without an error", async () => {
  const actions = service([
    legacyHistoryResponse([]),
    legacyHistoryResponse([]),
  ]);
  const result = await actions.getCompanionSessions("new-companion");
  assert.equal(result.error, undefined);
  assert.equal(result.data.length, 0);
  assert.equal(result.count, 0);
  for (const query of actions.queries)
    assert.ok(
      query.some(
        ([operation, column, value]) =>
          operation === "eq" && column === "user_id" && value === "learner",
      ),
    );
});

test("an empty modern history list is successful without a fallback query", async () => {
  const actions = service([{ data: [], count: 0, error: null }]);
  const result = await actions.getCompanionSessions("new-companion");
  assert.equal(result.error, undefined);
  assert.equal(result.data.length, 0);
  assert.equal(result.count, 0);
  assert.equal(actions.queries.length, 1);
});

test("legacy saved voice sessions can be listed and opened", async () => {
  const row = { id: 7, created_at: "2026-10-15T04:00:00Z", messages: "[]" };
  const actions = service([
    legacyHistoryResponse([]),
    {
      data: [{ id: row.id, created_at: row.created_at }],
      count: 1,
      error: null,
    },
    legacyHistoryResponse(null),
    { data: row, error: null },
  ]);
  const list = await actions.getCompanionSessions("companion");
  assert.equal(list.error, undefined);
  assert.equal(list.data[0].interaction_mode, "voice");
  assert.equal(list.data[0].canResume, false);
  assert.equal(list.data[0].duration_seconds, null);
  assert.equal(list.data[0].messages, undefined);
  const detail = await actions.getCompanionSession("companion", row.id);
  assert.equal(detail.error, undefined);
  assert.equal(detail.data.messages, "[]");
  assert.equal(detail.data.interaction_mode, "voice");
  assert.equal(detail.data.canResume, false);
  assert.equal(detail.data.learning_recap, null);
});

test("real history failures are not converted to empty sessions", async () => {
  for (const error of [
    { code: "08006", message: "Connection failed" },
    { code: "42501", message: "Permission denied" },
  ]) {
    const actions = service([{ data: null, error }]);
    const result = await actions.getCompanionSessions("companion");
    assert.equal(result.error, "Fetch failed");
    assert.equal(result.errorDescription, error.message);
    assert.equal(actions.queries.length, 1);
  }
});

test("saved session details are restricted to this learner and companion", async () => {
  const actions = service([
    {
      data: {
        id: 4,
        interaction_mode: "text",
        ended_by_user: false,
        vapi_chat_id: "private-id",
        messages: "[]",
        created_at: "2026-10-15T04:00:00Z",
        learning_recap: null,
      },
      error: null,
    },
  ]);
  const result = await actions.getCompanionSession("companion", 4);
  assert.equal(result.data.canResume, true);
  assert.equal(result.data.vapi_chat_id, undefined);
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "id" && value === 4,
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" &&
        column === "companion_id" &&
        value === "companion",
    ),
  );
});

test("signed-out callers cannot list or open transcripts", async () => {
  const actions = service([], null);
  assert.equal(
    (await actions.getCompanionSessions("companion")).error,
    "Unauthorized",
  );
  assert.equal(
    (await actions.getCompanionSession("companion", 4)).error,
    "Unauthorized",
  );
  assert.equal(actions.queries.length, 0);
});

test("an unsaved call is inserted after its identity lookup", async () => {
  const actions = service([
    { data: null, error: null },
    { data: { id: 42 }, error: null },
  ]);
  const result = await actions.saveSessionHistory(
    "companion",
    false,
    "[]",
    "learner",
    60,
    true,
    "call-2",
  );
  assert.equal(result.data?.id, 42);
  assert.equal(
    actions.queries.flat().filter(([operation]) => operation === "insert")
      .length,
    1,
  );
});

test("a failed identity lookup does not risk a duplicate insert", async () => {
  const actions = service([
    { data: null, error: { message: "Database offline" } },
  ]);
  const result = await actions.saveSessionHistory(
    "companion",
    false,
    "[]",
    "learner",
    60,
    true,
    "call-1",
  );
  assert.equal(result.error, "Save failed");
  assert.equal(
    actions.queries.flat().some(([operation]) => operation === "insert"),
    false,
  );
});

test("another learner cannot save or fetch this learner's transcript", async () => {
  const actions = service([], "different-learner");
  assert.equal(
    (
      await actions.saveSessionHistory(
        "companion",
        false,
        "[]",
        "learner",
        60,
        true,
        "call",
      )
    ).error,
    "Unauthorized",
  );
  assert.equal(
    (await actions.getLastUserSession("companion", "learner")).error,
    "Unauthorized",
  );
  assert.equal(actions.queries.length, 0);
});

test("latest transcript lookup is scoped to learner and companion", async () => {
  const actions = service([
    {
      data: {
        id: 5,
        user_id: "learner",
        interaction_mode: "text",
        vapi_chat_id: "chat-1",
      },
      error: null,
    },
  ]);
  const result = await actions.getLastUserSession(
    "community-companion",
    "learner",
  );
  assert.equal(result.data?.id, 5);
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" && column === "user_id" && value === "learner",
    ),
  );
  assert.ok(
    actions.queries[0].some(
      ([operation, column, value]) =>
        operation === "eq" &&
        column === "companion_id" &&
        value === "community-companion",
    ),
  );
});
