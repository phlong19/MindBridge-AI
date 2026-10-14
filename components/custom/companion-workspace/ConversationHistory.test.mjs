import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("./ConversationHistory.tsx", import.meta.url),
  "utf8",
);

// Render the actual modal with persistent hook state and controlled server IO.
function modal(result) {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
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
    useEffect() {},
  };
  const testModule = { exports: {} };
  const element = (type, props) => ({ type, props });
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module: testModule,
      exports: testModule.exports,
      require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime")
          return { jsx: element, jsxs: element };
        if (name === "@/lib/services/sessions-history")
          return {
            getCompanionSessions: async () => {
              if (result instanceof Error) throw result;
              return result;
            },
          };
        return new Proxy({}, { get: (_, property) => String(property) });
      },
    },
  );
  function render() {
    cursor = 0;
    return testModule.exports.default({
      companionId: "new-companion",
      session: { locked: false, isNavigationLocked: () => false },
    });
  }
  return { render };
}

function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!element || typeof element !== "object") return [];
  return [element, ...nodes(element.props?.children)];
}

function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (typeof element === "string") return element;
  return element && typeof element === "object"
    ? text(element.props?.children)
    : "";
}

test("a new companion's history modal displays an empty state without an alert or retry", async () => {
  const app = modal({ data: [], count: 0 });
  app.render().props.onOpenChange(true);
  await new Promise(setImmediate);
  const view = app.render();
  assert.match(text(view), /No conversations yet/);
  assert.doesNotMatch(text(view), /Could not load|Retry|Load more sessions/);
  assert.equal(
    nodes(view).some((node) => node.props.role === "alert"),
    false,
  );
});

test("real history failures display a retryable error instead of an empty state", async () => {
  for (const failure of [
    { error: "Database unavailable" },
    new Error("Network failed"),
  ]) {
    const app = modal(failure);
    app.render().props.onOpenChange(true);
    await new Promise(setImmediate);
    const view = app.render();
    assert.match(text(view), /Could not load your sessions/);
    assert.match(text(view), /Retry/);
    assert.doesNotMatch(text(view), /No conversations yet/);
    assert.equal(
      nodes(view).some((node) => node.props.role === "alert"),
      true,
    );
  }
});
