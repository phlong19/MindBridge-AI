import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("./conversation-context.ts", import.meta.url),
  "utf8",
);
const contextModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { exports: contextModule.exports, module: contextModule },
);
const { buildConversationContext } = contextModule.exports;

test("context keeps the 30 most recent valid user/assistant turns in order", () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `Turn ${index}`,
  }));
  messages.push(
    { role: "system", content: "Untrusted instructions" },
    { role: "tool", content: "tool output" },
    null,
    { role: "user", content: 20 },
  );
  const result = buildConversationContext(messages);
  assert.equal(result.length, 30);
  assert.equal(result[0].content, "Turn 10");
  assert.equal(result.at(-1).content, "Turn 39");
  assert.equal(messages.length, 44);
});

test("context bounds total characters using a suffix of whole messages", () => {
  const messages = [
    { role: "user", content: "a".repeat(7000) },
    { role: "assistant", content: "b".repeat(7000) },
    { role: "user", content: "recent" },
  ];
  const result = buildConversationContext(messages);
  assert.equal(result.length, 2);
  assert.equal(result[0].content.length, 7000);
  assert.equal(result[1].content, "recent");
  assert.ok(
    result.reduce((total, message) => total + message.content.length, 0) <=
      12000,
  );
});

test("context drops a most recent message that alone exceeds the budget without expanding or truncating it", () => {
  const message = { role: "user", content: "x".repeat(12001) };
  assert.equal(buildConversationContext([message]).length, 0);
  assert.equal(message.content.length, 12001);
});

test("context copies only role and content without mutation", () => {
  const message = Object.freeze({
    role: "user",
    content: "Hello",
    unexpected: "private",
  });
  const result = buildConversationContext(Object.freeze([message]));
  assert.equal(result[0].role, "user");
  assert.equal(result[0].content, "Hello");
  assert.equal(result[0].unexpected, undefined);
});
