import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("./text-chat.ts", import.meta.url), "utf8");

function service(responses, userId = "learner") {
  const queries = [];
  const database = {
    from(table) {
      const response = responses.shift();
      const operations = [["from", table]];
      queries.push(operations);
      const query = {};
      for (const method of ["select", "eq", "update"])
        query[method] = (...args) => {
          operations.push([method, ...args]);
          return query;
        };
      query.maybeSingle = async () => response;
      query.then = (resolve, reject) =>
        Promise.resolve(response).then(resolve, reject);
      return query;
    },
  };
  const testModule = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: testModule,
      exports: testModule.exports,
      Date,
      require(name) {
        if (name === "@clerk/nextjs/server")
          return { auth: async () => ({ userId }) };
        if (name === "@/lib/supabase")
          return { createSupabaseClient: () => database };
        if (name === "@/constants/message")
          return {
            error: {
              notAuthenticated: "Unauthorized",
              invalidRequest: "Invalid request",
              accessDenied: "Access denied",
              fetchFail: "Read failed",
              insertFail: "Save failed",
            },
          };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return { ...testModule.exports, queries };
}

test("closing an old text session authenticates and validates before querying", async () => {
  const anonymous = service([], null);
  assert.equal(
    (await anonymous.finishCompanionTextSession(4)).error,
    "Unauthorized",
  );
  assert.equal(anonymous.queries.length, 0);
  const actions = service([]);
  for (const id of [0, -1, 1.5, NaN])
    assert.equal(
      (await actions.finishCompanionTextSession(id)).error,
      "Invalid request",
    );
  assert.equal(actions.queries.length, 0);
});

test("closing an old text session scopes reads and writes to the signed-in learner", async () => {
  const actions = service([
    {
      data: {
        id: 4,
        interaction_mode: "text",
        created_at: new Date(Date.now() - 61_000).toISOString(),
      },
      error: null,
    },
    { error: null },
  ]);
  assert.equal((await actions.finishCompanionTextSession(4)).data, true);
  assert.equal(actions.queries.length, 2);
  for (const query of actions.queries) {
    assert.ok(
      query.some(
        ([method, field, value]) =>
          method === "eq" && field === "user_id" && value === "learner",
      ),
    );
    assert.ok(
      query.some(
        ([method, field, value]) =>
          method === "eq" && field === "id" && value === 4,
      ),
    );
  }
  const update = actions.queries[1].find(([method]) => method === "update")[1];
  assert.equal(update.ended_by_user, true);
  assert.ok(update.duration_seconds >= 61);
});

test("missing and voice sessions cannot be closed as legacy text sessions", async () => {
  for (const data of [null, { id: 4, interaction_mode: "voice" }]) {
    const actions = service([{ data, error: null }]);
    assert.equal(
      (await actions.finishCompanionTextSession(4)).error,
      "Access denied",
    );
    assert.equal(actions.queries.length, 1);
  }
});

test("legacy text session read and write errors remain visible", async () => {
  const read = service([
    { data: null, error: { message: "Database offline" } },
  ]);
  assert.equal(
    (await read.finishCompanionTextSession(4)).errorDescription,
    "Database offline",
  );
  const write = service([
    {
      data: {
        id: 4,
        interaction_mode: "text",
        created_at: new Date().toISOString(),
      },
      error: null,
    },
    { error: { message: "Write failed" } },
  ]);
  assert.equal(
    (await write.finishCompanionTextSession(4)).errorDescription,
    "Write failed",
  );
});
