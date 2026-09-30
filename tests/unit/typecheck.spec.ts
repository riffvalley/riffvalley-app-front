import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { BASELINE_PATH, baselineFrom, baselineAdditions, checkTypeScript, compareDiagnostics, parseDiagnostics, readBaseline, runCompiler } from "../../scripts/typecheck.mjs";

const temporary: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rv-typecheck-"));
  temporary.push(root);
  fs.mkdirSync(path.join(root, "src/modules/catalog"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/modules/catalog/example.ts"), 'const title: string = 123;\n');
  return root;
}
const diagnostic = {
  file: "src/modules/catalog/example.ts", code: 2322,
  message: "Type 'number' is not assignable to type 'string'.", source: 'const title: string = 123;', line: 1, column: 7,
};
function git(root: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

afterEach(() => {
  for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("TypeScript diagnostic baseline", () => {
  it("normalizes absolute paths and multiline messages while retaining code and source", () => {
    const root = fixture();
    const output = `${root}/src/modules/catalog/example.ts(1,7): error TS2322: Type 'number' is not assignable to type 'string'.\n  Related file: '${root}/node_modules/example.d.ts'\n`;
    const [parsed] = parseDiagnostics(output, root);
    expect(parsed).toEqual({ ...diagnostic, message: `${diagnostic.message}\n  Related file: '<repo>/node_modules/example.d.ts'` });
  });

  it("allows line movement without increasing debt", () => {
    expect(compareDiagnostics([{ ...diagnostic, line: 100, column: 4 }], baselineFrom([diagnostic])).added).toEqual([]);
  });

  it.each([
    { ...diagnostic, file: "src/modules/new/example.ts" },
    { ...diagnostic, code: 2345 },
    { ...diagnostic, message: "Another error" },
    { ...diagnostic, source: "const other: string = 123;" },
  ])("rejects a changed diagnostic signature: %j", (changed) => {
    expect(compareDiagnostics([changed], baselineFrom([diagnostic])).added).toHaveLength(1);
  });

  it("does not let a fixed error offset a new one or an extra identical occurrence", () => {
    const baseline = baselineFrom([diagnostic]);
    expect(compareDiagnostics([diagnostic, diagnostic], baseline).added).toHaveLength(1);
    expect(compareDiagnostics([{ ...diagnostic, code: 2345 }], baseline)).toMatchObject({
      added: [expect.objectContaining({ code: 2345 })], resolved: [expect.objectContaining({ code: 2322 })],
    });
  });

  it("reports stale exceptions and permits only a subset of the committed baseline", () => {
    const baseline = baselineFrom([diagnostic, diagnostic]);
    expect(compareDiagnostics([diagnostic], baseline).resolved).toHaveLength(1);
    expect(baselineAdditions(baselineFrom([diagnostic]), baseline)).toEqual([]);
    expect(baselineAdditions(baselineFrom([{ ...diagnostic, source: "changed" }]), baseline)).toHaveLength(1);
  });

  it.each([
    "error TS18003: No inputs were found in config file.",
    "Compiler crashed",
    "outside.ts(1,1): error TS2322: wrong scope",
    "src/modules/catalog/example.ts(50,1): error TS2322: wrong position",
  ])("fails closed on compiler/configuration errors: %s", (output) => {
    expect(() => parseDiagnostics(output, fixture())).toThrow();
  });

  it("rejects malformed, duplicate and wildcard baseline entries", () => {
    const baseline = baselineFrom([diagnostic]);
    expect(() => readBaseline(JSON.stringify({ ...baseline, diagnostics: [{ ...baseline.diagnostics[0], file: "src/**" }] }))).toThrow();
    expect(() => readBaseline(JSON.stringify({ ...baseline, version: 2 }))).toThrow();
    expect(() => readBaseline(JSON.stringify({ ...baseline, diagnostics: [baseline.diagnostics[0], baseline.diagnostics[0]] }))).toThrow();
    expect(() => readBaseline(JSON.stringify({ ...baseline, diagnostics: [{ ...baseline.diagnostics[0], count: 0 }] }))).toThrow();
  });
});

it("runs the real compiler on TS and Vue sources and enforces the Git ratchet", () => {
  const root = fixture();
  const repository = fileURLToPath(new URL("../../", import.meta.url));
  fs.symlinkSync(path.join(repository, "node_modules"), path.join(root, "node_modules"), "dir");
  fs.writeFileSync(path.join(root, "tsconfig.app.json"), JSON.stringify({
    extends: path.join(repository, "tsconfig.app.json"),
    include: ["src/**/*.ts", "src/**/*.vue"],
  }));
  fs.writeFileSync(path.join(root, "src/modules/catalog/example.ts"), "export const title: string = 123;\n");
  const vueFile = path.join(root, "src/modules/catalog/Example.vue");
  fs.writeFileSync(vueFile, '<script setup lang="ts">const value = 1;</script>\n<template>{{ value.toUpperCase() }}</template>\n');
  const diagnostics = runCompiler(root);
  expect(diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ file: "src/modules/catalog/example.ts", code: 2322 }),
    expect.objectContaining({ file: "src/modules/catalog/Example.vue", code: 2339 }),
  ]));
  fs.mkdirSync(path.join(root, "docs"));
  const baseline = path.join(root, BASELINE_PATH);
  fs.writeFileSync(baseline, JSON.stringify(baselineFrom(diagnostics)));
  git(root, "init", "--quiet");
  git(root, "add", BASELINE_PATH);
  git(root, "-c", "user.name=Typecheck test", "-c", "user.email=typecheck@example.test", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "initial baseline");
  const initial = git(root, "rev-parse", "HEAD");
  expect(checkTypeScript(root)).toBe(diagnostics.length);
  fs.writeFileSync(baseline, JSON.stringify(baselineFrom([...diagnostics, diagnostic])));
  expect(() => checkTypeScript(root)).toThrow("solo puede reducirse");
  // Even committing the expanded baseline cannot bypass a PR's base reference.
  git(root, "add", BASELINE_PATH);
  git(root, "-c", "user.name=Typecheck test", "-c", "user.email=typecheck@example.test", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "expanded baseline");
  expect(() => checkTypeScript(root, { reference: initial })).toThrow("solo puede reducirse");
  fs.writeFileSync(baseline, JSON.stringify(baselineFrom(diagnostics)));
  fs.writeFileSync(vueFile, '<script setup lang="ts">const value = 1;</script>\n<template>{{ value }}</template>\n');
  expect(() => checkTypeScript(root, { reference: initial })).toThrow("diagnósticos resueltos");
  expect(checkTypeScript(root, { reference: initial, prune: true })).toBe(1);
  expect(readBaseline(fs.readFileSync(baseline, "utf8")).diagnostics).toHaveLength(1);
  fs.writeFileSync(path.join(root, "src/modules/catalog/new.ts"), 'export const added: number = "regression";\n');
  expect(() => checkTypeScript(root, { reference: initial })).toThrow("Nuevas regresiones");
  expect(() => checkTypeScript(root, { reference: "missing-reference" })).toThrow("Referencia de baseline inaccesible");
}, 60_000);
