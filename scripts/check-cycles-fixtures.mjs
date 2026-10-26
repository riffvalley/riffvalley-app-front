import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addedCycleComponents,
  describeCycles,
  isBlockingCycle,
  scanGraph,
} from "./check-cycles.mjs";

const repositoryRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const fixtureRelativePath = "src/views/__fq34-cycle-fixtures__";
const fixturePath = join(repositoryRoot, fixtureRelativePath);
const fixtures = {
  "runtime-a.ts": 'import "./runtime-b"; export const runtimeA = true;\n',
  "runtime-b.ts": 'import "./runtime-a"; export const runtimeB = true;\n',
  "vue-a.vue":
    '<script setup lang="ts">import "@views/__fq34-cycle-fixtures__/vue-b.vue";</script>\n',
  "vue-b.vue": '<script setup lang="ts">import "./vue-a.vue";</script>\n',
  "type-a.ts": 'import type { TypeB } from "./type-b"; export interface TypeA extends TypeB {}\n',
  "type-b.ts": 'import type { TypeA } from "./type-a"; export interface TypeB extends TypeA {}\n',
  "alias-a.ts": 'import "@views/__fq34-cycle-fixtures__/alias-b"; export const aliasA = true;\n',
  "alias-b.ts": 'import "@/views/__fq34-cycle-fixtures__/alias-a"; export const aliasB = true;\n',
  "test-a.test.ts": 'import "./test-b"; export const testA = true;\n',
  "test-b.ts": 'import "./test-a.test"; export const testB = true;\n',
  "valid-entry.ts": 'import "./valid-leaf"; export const validEntry = true;\n',
  "valid-leaf.ts": "export const validLeaf = true;\n",
};

await mkdir(fixturePath);
try {
  await Promise.all(
    Object.entries(fixtures).map(([name, contents]) => writeFile(join(fixturePath, name), contents))
  );
  const scan = await scanGraph({ root: repositoryRoot, entries: [fixtureRelativePath] });
  assert.deepEqual(scan.unresolved, [], "all relative and configured alias imports should resolve");
  const cycles = describeCycles(scan.graph);
  const fixturesInCycle = (name) =>
    cycles.find((cycle) => cycle.nodes.some((node) => node.endsWith(`/${name}`)));

  assert(fixturesInCycle("runtime-a.ts"), "runtime TypeScript cycle should be detected");
  assert(fixturesInCycle("vue-a.vue"), "Vue SFC cycle should be detected through the @views alias");
  assert.equal(
    fixturesInCycle("type-a.ts")?.kind,
    "type-only",
    "type-only cycle should be classified"
  );
  assert.equal(
    isBlockingCycle(fixturesInCycle("type-a.ts")),
    false,
    "type-only cycles should remain informational"
  );
  assert(fixturesInCycle("alias-a.ts"), "@/ TypeScript alias cycle should be detected");
  const testCycle = fixturesInCycle("test-a.test.ts");
  assert(testCycle, "test cycle should be detected in the source graph");
  assert.equal(testCycle.scope, "test", "test cycles should be categorized separately");
  assert.equal(isBlockingCycle(testCycle), false, "test cycles should remain informational");
  assert(
    testCycle.nodes.some((node) => node.endsWith(".test.ts")),
    "test path should remain identifiable"
  );
  assert.equal(
    fixturesInCycle("valid-entry.ts"),
    undefined,
    "acyclic imports should not be reported"
  );

  const baseline = cycles.filter(
    (cycle) => !cycle.nodes.some((node) => node.endsWith("/vue-a.vue"))
  );
  const added = addedCycleComponents(cycles, baseline);
  assert.equal(
    added.length,
    1,
    "delta should identify only the cycle absent from the baseline graph"
  );
  assert(
    added[0].nodes.some((node) => node.endsWith("/vue-a.vue")),
    "the added Vue cycle should be identified"
  );
  assert(
    isBlockingCycle(added[0]),
    "new production runtime cycles should block on a reliable baseline"
  );

  console.log(
    `Cycle fixtures passed (${scan.moduleCount} fixture modules; TS, Vue, type-only, aliases, tests, acyclic).`
  );
  for (const cycle of cycles) console.log(`  ${cycle.kind}: ${cycle.nodes.join(" -> ")}`);
} finally {
  await rm(fixturePath, { recursive: true, force: true });
}
