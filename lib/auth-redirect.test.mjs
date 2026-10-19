import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(file, mocks = {}, globals = {}) {
  const testModule = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module: testModule,
      exports: testModule.exports,
      URL,
      URLSearchParams,
      ...globals,
      require(name) {
        if (name in mocks) return mocks[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return testModule.exports;
}
const redirect = load("./auth-redirect.ts");

test("auth callbacks preserve companion paths, queries, and fragments", () => {
  const destination =
    "/companions/english?source=community&lesson=2#conversation";
  const signIn = new URL(
    redirect.getSignInPath(destination),
    "https://example.com",
  );
  assert.equal(signIn.pathname, "/auth/login");
  assert.equal(
    redirect.getSafeReturnPath(signIn.searchParams.get("redirect_url")),
    destination,
  );
});

test("auth callbacks reject external destinations and authentication loops", () => {
  for (const destination of [
    undefined,
    ["/companions/english"],
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "javascript:alert(1)",
    "/auth/login",
    "/auth/register?redirect_url=/auth/login",
  ])
    assert.equal(redirect.getSafeReturnPath(destination), "/");
});

test("Clerk can normalize a callback to an absolute URL on this application", () => {
  assert.equal(
    redirect.getSafeReturnPath(
      "https://example.com/companions/english?source=home",
      "https://example.com",
    ),
    "/companions/english?source=home",
  );
  assert.equal(
    redirect.getSafeReturnPath(
      "https://evil.example/companions/english",
      "https://example.com",
    ),
    "/",
  );
});

function middleware(userId) {
  return load(
    "../middleware.ts",
    {
      "@/lib/auth-redirect": redirect,
      "@clerk/nextjs/server": {
        clerkMiddleware: (handler) => (req) =>
          handler(async () => ({ userId }), req),
        createRouteMatcher: (config) =>
          typeof config === "function"
            ? config
            : (req) => req.nextUrl.pathname.startsWith("/admin"),
      },
      "next/server": {
        NextResponse: {
          redirect: (url) => ({ location: String(url), cookies: { set() {} } }),
          next: () => ({ next: true }),
        },
      },
    },
    { process: { env: { ADMIN_USER_ID: "admin" } } },
  ).default;
}
function request(path) {
  const nextUrl = new URL(path, "https://example.com");
  return { url: nextUrl.href, nextUrl };
}

test("anonymous companion navigation reaches sign-in with the full return path", async () => {
  const response = await middleware(null)(
    request("/companions/english?source=home"),
  );
  const url = new URL(response.location);
  assert.equal(url.pathname, "/auth/login");
  assert.equal(
    url.searchParams.get("redirect_url"),
    "/companions/english?source=home",
  );
});

test("public browsing and authenticated companion navigation remain available", async () => {
  assert.equal((await middleware(null)(request("/"))).next, true);
  assert.equal(
    (await middleware(null)(request("/companions/community"))).next,
    true,
  );
  assert.equal(
    (await middleware("learner")(request("/companions/english"))).next,
    true,
  );
});

test("unauthorized admin navigation does not create a sign-in redirect loop", async () => {
  const response = await middleware("learner")(request("/admin/voices"));
  assert.equal(new URL(response.location).pathname, "/auth/login");
  assert.equal(new URL(response.location).search, "");
});

test("normal sign-in and the test-account shortcut return to the same companion", async () => {
  const destination = "/companions/english?source=home";
  const navigations = [];
  const activations = [];
  const element = (type, props) => ({ type, props });
  const form = load(
    "../components/auth/LoginForm.tsx",
    {
      "react/jsx-runtime": { jsx: element, jsxs: element },
      "@/lib/i18n/provider": {
        useI18n: () => ({ t: (message) => message, locale: "en" }),
        LocalizedText: "LocalizedText",
      },
      react: { useState: (initial) => [initial, () => {}], useEffect() {} },
      "@clerk/nextjs": {
        SignIn: "SignIn",
        useAuth: () => ({ isLoaded: true }),
        useSignIn: () => ({
          isLoaded: true,
          signIn: {
            create: async () => ({
              status: "complete",
              createdSessionId: "test-session",
            }),
          },
          setActive: async (value) => activations.push(value.session),
        }),
      },
      "@/components/custom/Loading": { default: "Loading" },
      "@/constants/message": { error: {} },
      "@/lib/utils": {},
      sonner: { toast: { error: (message) => assert.fail(message) } },
    },
    { window: { location: { assign: (value) => navigations.push(value) } } },
  );
  const view = form.default({
    returnPath: destination,
    testCredentials: { email: "test@example.com", password: "test-only" },
  });
  const [button, signIn] = view.props.children;
  assert.equal(signIn.props.forceRedirectUrl, destination);
  assert.equal(signIn.props.signUpForceRedirectUrl, destination);
  await button.props.onClick();
  assert.deepEqual(activations, ["test-session"]);
  assert.deepEqual(navigations, [destination]);
});

test("admin checks use the authenticated session even when a body claims an admin ID", async () => {
  for (const userId of [null, "learner", "admin"]) {
    const route = load(
      "../app/api/check-admin/route.ts",
      {
        "@clerk/nextjs/server": { auth: async () => ({ userId }) },
        "next/server": { NextResponse: { json: (value) => value } },
      },
      { process: { env: { ADMIN_USER_ID: "admin" } } },
    );
    const result = await route.POST({
      json: async () => ({ userId: "admin" }),
    });
    assert.equal(result.isAdmin, userId === "admin");
  }
});
