import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const catalog = JSON.parse(
  readFileSync(new URL("./vi.json", import.meta.url), "utf8"),
);
function load(path, mocks = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      ...globals,
      require(name) {
        if (name in mocks) return mocks[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return module.exports;
}
const config = load("./config.ts");
const { translate } = load("./translate.ts", { "./vi.json": catalog });

test("English is the default and unsupported cookies cannot select an unknown locale", () => {
  for (const value of [undefined, null, "", "fr", "VI", "../../vi"])
    assert.equal(config.resolveLocale(value), "en");
  assert.equal(config.resolveLocale("vi"), "vi");
  assert.equal(config.resolveLocale("en"), "en");
});

test("Vietnamese translations preserve English defaults and unknown user content", () => {
  assert.equal(translate("vi", "Home"), "Trang chủ");
  assert.equal(
    translate("vi", "Recently Practiced Companions"),
    "Bạn đồng hành được luyện tập gần đây",
  );
  for (const source of Object.keys(catalog))
    assert.equal(translate("en", source), source);
  assert.equal(
    translate("vi", "Alice, my English tutor"),
    "Alice, my English tutor",
  );
});

test("switching language persists the preference and updates in place without navigation", () => {
  const states = [];
  let cursor = 0;
  const document = { cookie: "", documentElement: { lang: "en" } };
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] = value;
        },
      ];
    },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
  };
  const element = (type, props) => ({ type, props });
  const provider = load(
    "./provider.tsx",
    {
      react,
      "react/jsx-runtime": { jsx: element, jsxs: element },
      "./config": config,
      "./translate": { translate },
    },
    { document, location: { protocol: "https:" } },
  );
  const child = { activeVoiceSession: "keep-this-session" };
  const render = () => {
    cursor = 0;
    return provider.I18nProvider({ initialLocale: "en", children: child });
  };
  const initial = render();
  initial.props.value.setLocale("vi");
  const vietnamese = render();
  assert.equal(vietnamese.props.value.t("Home"), "Trang chủ");
  assert.equal(vietnamese.props.children, child);
  assert.equal(document.documentElement.lang, "vi");
  assert.match(document.cookie, /mindbridge-locale=vi; Path=\//);
  assert.match(document.cookie, /SameSite=Lax; Secure/);
  vietnamese.props.value.setLocale("en");
  assert.equal(render().props.value.t("Home"), "Home");
  assert.equal(document.documentElement.lang, "en");
});

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory()
      ? files(path)
      : path.endsWith(".tsx")
        ? [path]
        : [];
  });
}
test("every static app translation has a nonempty Vietnamese entry", () => {
  const missing = new Set();
  for (const file of [...files("app"), ...files("components")]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function verify(message) {
      if (message && !catalog[message]) missing.add(message);
    }
    function walk(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "t" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        verify(node.arguments[0].text);
      if (
        ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(source) === "LocalizedText"
      )
        for (const child of node.children)
          if (ts.isJsxText(child))
            verify(child.text.replace(/\s+/g, " ").trim());
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  assert.deepEqual([...missing].sort(), []);
});

test("translated subject choices keep their stored English identifiers", () => {
  const pushed = [];
  const element = (type, props) => ({ type, props });
  const filter = load(
    "../../components/custom/SubjectFilter.tsx",
    {
      react: {},
      "react/jsx-runtime": { jsx: element, jsxs: element },
      "@/lib/i18n/provider": {
        useI18n: () => ({ t: (message) => translate("vi", message) }),
        LocalizedText: "LocalizedText",
      },
      "@/constants": { subjects: ["language", "maths"] },
      "next/navigation": {
        useRouter: () => ({ push: (path) => pushed.push(path) }),
        usePathname: () => "/companions/community",
        useSearchParams: () => new URLSearchParams(),
      },
      "../ui/Select": new Proxy({}, { get: (_, name) => name }),
    },
    { URLSearchParams },
  );
  const select = filter.default().props.children;
  const choices = select.props.children[1].props.children[1];
  assert.equal(choices[0].props.value, "language");
  assert.equal(choices[0].props.children, "Ngôn ngữ");
  select.props.onValueChange(choices[0].props.value);
  assert.equal(pushed[0], "/companions/community?subject=language");
});

test("language choices live directly in the avatar menu and select the locale", () => {
  const selected = [];
  const element = (type, props) => ({ type, props });
  const UserButton = Object.assign(() => null, {
    MenuItems: "MenuItems",
    Action: "Action",
  });
  const { HeaderUserButton } = load(
    "../../components/custom/LanguageSwitcher.tsx",
    {
      "react/jsx-runtime": { jsx: element, jsxs: element },
      "lucide-react": { Check: "Check", Languages: "Languages" },
      "@clerk/nextjs": { UserButton },
      "@/lib/i18n/provider": {
        useI18n: () => ({
          locale: "vi",
          setLocale: (value) => selected.push(value),
        }),
      },
      "@/lib/i18n/config": config,
    },
  );
  const avatar = HeaderUserButton();
  assert.equal(avatar.type, UserButton);
  const options = avatar.props.children.props.children;
  assert.deepEqual(
    Array.from(options, (item) => item.props.label),
    ["English", "Tiếng Việt"],
  );
  assert.equal(options[1].props.labelIcon.type, "Check");
  options[0].props.onClick();
  options[1].props.onClick();
  assert.deepEqual(selected, ["en", "vi"]);
  const navbar = readFileSync("components/custom/Navbar.tsx", "utf8");
  assert.doesNotMatch(navbar, /<LanguageSwitcher\b/);
});
