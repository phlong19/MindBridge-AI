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
        "upsert",
        "or",
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

test("a retry atomically updates the same call with the latest transcript and end state", async () => {
  const actions = service([
    { data: { id: 41 }, error: null },
    { data: { id: 41 }, error: null },
  ]);
  const live = await actions.saveSessionHistory(
    "companion",
    false,
    "live transcript",
    "learner",
    25.9,
    false,
    "call-1",
  );
  const finished = await actions.saveSessionHistory(
    "companion",
    false,
    "complete transcript",
    "learner",
    61.9,
    true,
    "call-1",
  );
  assert.equal(live.data.id, 41);
  assert.equal(finished.data.id, 41);
  assert.equal(actions.queries.length, 2);
  for (const [index, query] of actions.queries.entries()) {
    const operation = query.find(([operation]) => operation === "upsert");
    assert.ok(operation, "each save must atomically upsert the latest state");
    assert.equal(operation[1].user_id, "learner");
    assert.equal(operation[1].companion_id, "companion");
    assert.equal(operation[1].vapi_call_id, "call-1");
    assert.equal(
      operation[1].messages,
      index ? "complete transcript" : "live transcript",
    );
    assert.equal(operation[1].ended_by_user, Boolean(index));
    assert.equal(operation[1].duration_seconds, index ? 61 : 25);
    assert.equal(operation[2].onConflict, "user_id,companion_id,vapi_call_id");
    assert.equal(operation[2].ignoreDuplicates, undefined);
  }
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
  assert.equal(list.data[0].is_demo, false);
  assert.equal(list.data[0].messages, undefined);
  const detail = await actions.getCompanionSession("companion", row.id);
  assert.equal(detail.error, undefined);
  assert.equal(detail.data.messages, "[]");
  assert.equal(detail.data.interaction_mode, "voice");
  assert.equal(detail.data.canResume, false);
  assert.equal(detail.data.learning_recap, null);
  assert.equal(detail.data.is_demo, false);
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

test("a call without a provider ID keeps ordinary insert behavior", async () => {
  const actions = service([{ data: { id: 42 }, error: null }]);
  const result = await actions.saveSessionHistory(
    "companion",
    false,
    "[]",
    "learner",
    -1,
    true,
    null,
  );
  assert.equal(result.data.id, 42);
  assert.equal(actions.queries.length, 1);
  const insert = actions.queries[0].find(
    ([operation]) => operation === "insert",
  );
  assert.equal(insert[1].duration_seconds, 0);
  assert.equal(insert[1].vapi_call_id, null);
});

test("nonfinite durations fail before writing a transcript", async () => {
  for (const duration of [NaN, Infinity, -Infinity, "60"]) {
    const actions = service([{ data: { id: 1 }, error: null }]);
    const result = await actions.saveSessionHistory(
      "companion",
      false,
      "[]",
      "learner",
      duration,
      true,
      "call-1",
    );
    assert.equal(result.error, "Invalid request");
    assert.equal(actions.queries.length, 0);
  }
});

test("an atomic save failure returns the database error", async () => {
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
  assert.equal(result.errorDescription, "Database offline");
  assert.equal(actions.queries.length, 1);
});

test("missing history metadata gives actionable migration guidance without risking duplicate saves", async () => {
  const actions = service([
    {
      data: null,
      error: {
        code: "42703",
        message: "column session-history.vapi_call_id does not exist",
      },
    },
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
  assert.match(result.errorDescription, /database.*update/i);
  assert.match(result.errorDescription, /retry saving/i);
  assert.equal(actions.queries.length, 1);
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

function timelineRow(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-18T04:00:00.123456+00:00",
    messages: JSON.stringify([{ role: "user", content: `Turn ${id}` }]),
    interaction_mode: "text",
    ended_by_user: false,
    learning_recap: null,
    is_demo: false,
    vapi_chat_id: `private-${id}`,
    duration_seconds: 60,
    ...overrides,
  };
}

test("conversation returns the latest 20 private sessions chronologically with an older-page cursor", async () => {
  const actions = service([
    {
      data: Array.from({ length: 21 }, (_, index) => timelineRow(30 - index)),
      error: null,
    },
  ]);
  const result = await actions.getCompanionConversation("companion");
  assert.equal(result.data.length, 20);
  assert.equal(result.data[0].id, 11);
  assert.equal(result.data.at(-1).id, 30);
  assert.equal(result.nextCursor.id, 11);
  assert.equal(result.nextCursor.createdAt, "2026-10-18T04:00:00.123456+00:00");
  assert.equal(result.data[0].messages, timelineRow(11).messages);
  assert.equal(result.data[0].canResume, true);
  assert.equal(result.data[0].vapi_chat_id, undefined);
  const query = actions.queries[0];
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
  assert.deepEqual(
    Array.from(
      query.filter(([op]) => op === "order"),
      ([, column, options]) => [column, options.ascending],
    ),
    [
      ["created_at", false],
      ["id", false],
    ],
  );
  assert.ok(query.some(([op, count]) => op === "limit" && count === 21));
  assert.match(query.find(([op]) => op === "select")[1], /is_demo/);
});

test("older conversation pages retain timestamp precision and use ID to break timestamp ties", async () => {
  const cursor = { createdAt: "2026-10-18T04:00:00.123456+00:00", id: 11 };
  const actions = service([{ data: [timelineRow(10)], error: null }]);
  const result = await actions.getCompanionConversation("companion", cursor);
  assert.equal(result.nextCursor, null);
  assert.equal(result.data[0].id, 10);
  assert.equal(
    actions.queries[0].find(([op]) => op === "or")[1],
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.11)`,
  );
});

test("demo, ended, voice, and provider-less sessions cannot be resumed", async () => {
  const actions = service([
    {
      data: [
        timelineRow(4, { is_demo: true }),
        timelineRow(3, { ended_by_user: true }),
        timelineRow(2, { interaction_mode: "voice" }),
        timelineRow(1, { vapi_chat_id: null }),
      ],
      error: null,
    },
  ]);
  const result = await actions.getCompanionConversation("companion");
  assert.ok(result.data.every((row) => row.canResume === false));
  assert.ok(result.data.every((row) => row.vapi_chat_id === undefined));
});

test("conversation validates authentication and cursor before querying", async () => {
  const signedOut = service([], null);
  assert.equal(
    (await signedOut.getCompanionConversation("companion")).error,
    "Unauthorized",
  );
  assert.equal(signedOut.queries.length, 0);
  for (const before of [
    { createdAt: "now),id.gt.0", id: 1 },
    { createdAt: "invalid", id: 1 },
    { createdAt: "2026-10-18T04:00:00Z", id: 1.5 },
    { createdAt: "2026-10-18T04:00:00Z", id: 0 },
    {},
  ]) {
    const actions = service([]);
    assert.equal(
      (await actions.getCompanionConversation("companion", before)).error,
      "Invalid request",
    );
    assert.equal(actions.queries.length, 0);
  }
});

test("empty conversation is successful and database failures remain visible", async () => {
  const empty = await service([
    { data: [], error: null },
  ]).getCompanionConversation("companion");
  assert.equal(empty.data.length, 0);
  assert.equal(empty.nextCursor, null);
  const failed = await service([
    { data: null, error: { message: "Connection failed" } },
  ]).getCompanionConversation("companion");
  assert.equal(failed.error, "Fetch failed");
  assert.equal(failed.errorDescription, "Connection failed");
});

test("existing history list and detail endpoints do not offer demo resume", async () => {
  const demo = timelineRow(4, { is_demo: true });
  const actions = service([
    { data: [demo], count: 1, error: null },
    { data: demo, error: null },
  ]);
  const list = await actions.getCompanionSessions("companion");
  const detail = await actions.getCompanionSession("companion", 4);
  assert.equal(list.data[0].canResume, false);
  assert.equal(detail.data.canResume, false);
  assert.ok(
    actions.queries.every((query) =>
      query.find(([op]) => op === "select")[1].includes("is_demo"),
    ),
  );
});
