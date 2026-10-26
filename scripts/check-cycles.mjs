import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cruise } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    maxBuffer: 100 * 1024 * 1024,
    ...options,
  });
  if (result.error || result.status !== 0) {
    return {
      error: result.error ?? new Error(result.stderr?.toString() || `git ${args[0]} failed`),
    };
  }
  return { stdout: result.stdout };
}

function normalizePath(filePath) {
  return filePath.split(sep).join("/");
}

export async function scanGraph({ root = repositoryRoot, entries = ["src"] } = {}) {
  const absoluteRoot = resolve(root);
  const tsConfigPath = join(absoluteRoot, "tsconfig.app.json");
  const result = await cruise(
    entries.map((entry) => resolve(absoluteRoot, entry)),
    {
      baseDir: absoluteRoot,
      tsPreCompilationDeps: "specify",
      doNotFollow: { path: "node_modules" },
    },
    {
      tsConfig: tsConfigPath,
      mainFields: ["browser", "module", "jsnext:main", "jsnext", "main"],
    },
    { tsConfig: extractTSConfig(tsConfigPath) }
  );
  const cruisedModules = result.output?.modules;
  if (result.exitCode !== 0 || !Array.isArray(cruisedModules)) {
    throw new Error(`dependency-cruiser did not return a usable graph (exit ${result.exitCode}).`);
  }
  const modules = cruisedModules.filter((module) =>
    normalizePath(module.source).startsWith("src/")
  );

  const graph = new Map();
  const unresolved = [];
  let externalDependencyCount = 0;
  let outOfSourceDependencyCount = 0;
  for (const module of modules) {
    const source = normalizePath(module.source);
    if (module.valid === false) unresolved.push(`${source} (module could not be parsed)`);
    const edges = [];
    for (const dependency of module.dependencies ?? []) {
      if (dependency.couldNotResolve) {
        unresolved.push(`${source} -> ${dependency.module}`);
      } else if (dependency.dependencyTypes?.includes("local") && dependency.resolved) {
        const target = normalizePath(dependency.resolved);
        if (target.startsWith("src/")) {
          edges.push({
            to: target,
            typeOnly: dependency.typeOnly === true || dependency.preCompilationOnly === true,
          });
        } else {
          outOfSourceDependencyCount += 1;
          unresolved.push(`${source} -> ${dependency.module} (resolved outside src: ${target})`);
        }
      } else {
        externalDependencyCount += 1;
      }
    }
    graph.set(source, edges);
  }
  return {
    graph,
    unresolved: [...new Set(unresolved)].sort(),
    moduleCount: modules.length,
    externalDependencyCount,
    outOfSourceDependencyCount,
  };
}

function stronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const indexes = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function connect(node) {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const edge of graph.get(node) ?? []) {
      if (!indexes.has(edge.to)) {
        connect(edge.to);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(edge.to)));
      } else if (onStack.has(edge.to)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(edge.to)));
      }
    }

    if (lowLinks.get(node) === indexes.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1 || (graph.get(node) ?? []).some((edge) => edge.to === node)) {
        components.push(component.sort());
      }
    }
  }

  for (const node of [...graph.keys()].sort()) {
    if (!indexes.has(node)) connect(node);
  }
  return components.sort((left, right) => left[0].localeCompare(right[0]));
}

function describeCycles(graph) {
  return stronglyConnectedComponents(graph).map((nodes) => {
    const members = new Set(nodes);
    const edges = nodes
      .flatMap((from) =>
        (graph.get(from) ?? [])
          .filter((edge) => members.has(edge.to))
          .map((edge) => ({ from, to: edge.to, typeOnly: edge.typeOnly }))
      )
      .sort((left, right) =>
        `${left.from}->${left.to}:${left.typeOnly}`.localeCompare(
          `${right.from}->${right.to}:${right.typeOnly}`
        )
      );
    const typeOnlyCount = edges.filter((edge) => edge.typeOnly).length;
    const kind =
      typeOnlyCount === 0 ? "runtime" : typeOnlyCount === edges.length ? "type-only" : "mixed";
    const scope = nodes.some((node) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(node))
      ? "test"
      : nodes.some(
            (node) =>
              node === "src/main.ts" || node === "src/App.vue" || node.startsWith("src/router/")
          )
        ? "composition-root"
        : "production";
    return {
      nodes,
      edges,
      kind,
      scope,
    };
  });
}

export function addedCycleComponents(currentCycles, baselineCycles) {
  const baselineCycleEdges = new Set(
    baselineCycles.flatMap((cycle) =>
      cycle.edges.map((edge) => `${edge.from}->${edge.to}:${edge.typeOnly}`)
    )
  );
  return currentCycles.filter((cycle) =>
    cycle.edges.some((edge) => !baselineCycleEdges.has(`${edge.from}->${edge.to}:${edge.typeOnly}`))
  );
}

export function isBlockingCycle(cycle) {
  return cycle.scope === "production" && cycle.kind !== "type-only";
}

function printReport(label, scan, cycles, { comparison = "informative" } = {}) {
  console.log(
    `\n${label}: ${scan.moduleCount} source module(s), ${scan.externalDependencyCount} external dependency edge(s), ${scan.unresolved.length} unresolved/out-of-scope local edge(s), ${cycles.length} cycle component(s).`
  );
  if (scan.unresolved.length) {
    for (const item of scan.unresolved) console.log(`  UNRESOLVED ${item}`);
  }
  for (const [index, cycle] of cycles.entries()) {
    console.log(`  ${cycle.scope} ${cycle.kind} cycle ${index + 1}:`);
    for (const edge of cycle.edges) {
      console.log(`    ${edge.from} -> ${edge.to}${edge.typeOnly ? " [type-only]" : ""}`);
    }
  }
  console.log(`  Comparison: ${comparison}.`);
}

export async function scanGitRevision(baseSha) {
  const tempRoot = await mkdtemp(join(tmpdir(), "fq34-base-"));
  try {
    const archive = runGit(["archive", "--format=tar", baseSha, "src", "tsconfig.app.json"]);
    if (archive.error) throw archive.error;
    const extraction = spawnSync("tar", ["-xf", "-", "-C", tempRoot], {
      input: archive.stdout,
      cwd: repositoryRoot,
    });
    if (extraction.error || extraction.status !== 0) {
      throw (
        extraction.error ??
        new Error(extraction.stderr?.toString() || "Could not extract base snapshot.")
      );
    }
    await symlink(join(repositoryRoot, "node_modules"), join(tempRoot, "node_modules"), "dir");
    return await scanGraph({ root: tempRoot });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function run() {
  let current;
  try {
    current = await scanGraph();
  } catch (error) {
    console.error(`Cycle graph scan failed: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const currentCycles = describeCycles(current.graph);
  let baseSha = process.env.FQ_QUALITY_BASE_SHA;
  const headSha = process.env.FQ_QUALITY_HEAD_SHA;
  let comparison = "informative (no reproducible base provided)";
  let addedCycles = [];
  let comparisonReliable = false;

  if (baseSha && headSha) {
    const mergeBase = runGit(["merge-base", baseSha, headSha], { encoding: "utf8" });
    if (!mergeBase.error && mergeBase.stdout.trim()) {
      baseSha = mergeBase.stdout.trim();
    } else {
      console.warn(
        `Could not find a merge base for ${baseSha} and ${headSha}; cycle results remain informational.`
      );
      baseSha = undefined;
    }
  } else {
    const head = runGit(["rev-parse", "HEAD"], { encoding: "utf8" });
    if (!head.error) baseSha = head.stdout.trim();
  }

  if (baseSha) {
    try {
      const baseline = await scanGitRevision(baseSha);
      const baselineCycles = describeCycles(baseline.graph);
      addedCycles = addedCycleComponents(currentCycles, baselineCycles);
      comparisonReliable =
        baseline.unresolved.length === 0 &&
        baseline.outOfSourceDependencyCount === 0 &&
        current.unresolved.length === 0 &&
        current.outOfSourceDependencyCount === 0;
      if (!comparisonReliable) {
        comparison = "incomplete graph; informative only";
        console.warn(
          `Cannot compare complete graphs (base: ${baseline.unresolved.length} unresolved/out-of-scope edge(s), current: ${current.unresolved.length + current.outOfSourceDependencyCount}); cycle delta remains informational.`
        );
      } else {
        comparison = `reproducible against ${baseSha}`;
      }
    } catch (error) {
      console.warn(
        `Could not compare against base (${error.message}); cycle results remain informational.`
      );
    }
  }

  printReport("Source graph", current, currentCycles, { comparison });
  if (comparisonReliable) {
    console.log(`New cycle component(s): ${addedCycles.length}.`);
    console.log(
      `Blocking delta: ${addedCycles.filter(isBlockingCycle).length} production runtime/mixed cycle(s).`
    );
    for (const cycle of addedCycles) {
      console.log(`  NEW ${cycle.scope} ${cycle.kind} cycle: ${cycle.nodes.join(" -> ")}`);
    }
  }

  if (current.unresolved.length) {
    console.warn(
      "The graph is incomplete; unresolved imports are reported above and the delta is not blocking."
    );
  }
  if (comparisonReliable && addedCycles.some(isBlockingCycle)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}

export { describeCycles };
