import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { scanGitRevision, scanGraph } from "./check-cycles.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const owners = new Set(["auth", "account", "users", "activity", "shared"]);
const allowedOwnerDependencies = new Map([
  ["auth", new Set(["account", "activity", "shared"])],
  ["account", new Set(["auth", "shared"])],
  ["users", new Set(["auth", "activity", "shared"])],
  ["activity", new Set(["auth", "users", "shared"])],
  ["shared", new Set()],
]);
const routerViewExceptions = new Set([
  "src/modules/identity/auth/login/LoginView.vue",
  "src/modules/identity/account/password-change/PasswordChangeView.vue",
  "src/modules/identity/users/user-management/UserManagementView.vue",
  "src/modules/identity/activity/layout/UserStatisticsLayout.vue",
  "src/modules/identity/activity/overview/UserStatisticsView.vue",
  "src/modules/identity/activity/user-activity/UserActivityView.vue",
  "src/modules/identity/activity/inactivity/UserInactivityView.vue",
]);

function identityOwner(filePath) {
  const match = filePath.replaceAll("\\", "/").match(/^src\/modules\/identity\/([^/]+)\//);
  return match && owners.has(match[1]) ? match[1] : undefined;
}

function isTestFile(filePath) {
  return /(?:^|\/)(__tests__\/|.*\.(?:test|spec)\.[cm]?[jt]sx?$)/.test(filePath);
}

export function classifyIdentityEdge({ from, to }) {
  const source = from.replaceAll("\\", "/");
  const target = to.replaceAll("\\", "/");
  const targetOwner = identityOwner(target);
  if (!targetOwner) return { allowed: true, reason: "outside-identity" };
  if (isTestFile(source)) return { allowed: true, reason: "test" };

  if (source === "src/router/index.ts" && routerViewExceptions.has(target)) {
    return { allowed: true, reason: "router-view-composition" };
  }

  const sourceOwner = identityOwner(source);
  if (sourceOwner === targetOwner) return { allowed: true, reason: "same-owner" };

  const isPublicEntry = target === `src/modules/identity/${targetOwner}/index.ts`;
  if (!isPublicEntry) {
    return {
      allowed: false,
      kind: "private-import",
      sourceOwner,
      targetOwner,
    };
  }

  if (!sourceOwner || allowedOwnerDependencies.get(sourceOwner)?.has(targetOwner)) {
    return { allowed: true, reason: sourceOwner ? "approved-owner-contract" : "public-contract" };
  }

  return {
    allowed: false,
    kind: "forbidden-owner-dependency",
    sourceOwner,
    targetOwner,
  };
}

export function collectIdentityBoundaryFindings(graph) {
  const findings = [];
  for (const [from, dependencies] of graph) {
    for (const { to } of dependencies) {
      const result = classifyIdentityEdge({ from, to });
      if (!result.allowed) {
        findings.push({ from, to, kind: result.kind });
      }
    }
  }
  return findings.sort((left, right) =>
    `${left.from}->${left.to}`.localeCompare(`${right.from}->${right.to}`)
  );
}

export function countIdentityTestEdges(graph) {
  let count = 0;
  for (const [from, dependencies] of graph) {
    if (!isTestFile(from)) continue;
    for (const { to } of dependencies) {
      if (identityOwner(to)) count += 1;
    }
  }
  return count;
}

export function addedIdentityBoundaryFindings(current, baseline) {
  const baselineKeys = new Set(baseline.map(({ from, to, kind }) => `${from}->${to}:${kind}`));
  return current.filter(({ from, to, kind }) => !baselineKeys.has(`${from}->${to}:${kind}`));
}

export function hasBlockingIdentityBoundaryDelta(comparisonReliable, current, baseline) {
  return comparisonReliable && addedIdentityBoundaryFindings(current, baseline).length > 0;
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function printFindings(label, findings) {
  console.log(`${label}: ${findings.length} production violation(s).`);
  for (const finding of findings) {
    console.log(`  ${finding.kind}: ${finding.from} -> ${finding.to}`);
  }
}

async function run() {
  let current;
  try {
    current = await scanGraph();
  } catch (error) {
    console.error(`Identity boundary scan failed: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const currentFindings = collectIdentityBoundaryFindings(current.graph);
  const unresolvedCount = current.unresolved.length + current.outOfSourceDependencyCount;
  let baseSha = process.env.FQ_QUALITY_BASE_SHA;
  const headSha = process.env.FQ_QUALITY_HEAD_SHA;
  let comparison = "informative (no reproducible base provided)";
  let baselineFindings;
  let comparisonReliable = false;

  if (baseSha && headSha) {
    const mergeBase = runGit(["merge-base", baseSha, headSha]);
    if (mergeBase) baseSha = mergeBase;
    else baseSha = undefined;
  } else {
    baseSha = runGit(["rev-parse", "HEAD"]);
  }

  if (baseSha) {
    try {
      const baseline = await scanGitRevision(baseSha);
      baselineFindings = collectIdentityBoundaryFindings(baseline.graph);
      comparisonReliable =
        baseline.unresolved.length === 0 &&
        baseline.outOfSourceDependencyCount === 0 &&
        unresolvedCount === 0;
      if (comparisonReliable) {
        comparison = `reproducible against ${baseSha}`;
      } else {
        comparison = "incomplete graph; informative only";
        console.warn(
          `Cannot compare complete graphs (base: ${baseline.unresolved.length + baseline.outOfSourceDependencyCount} unresolved/out-of-scope edge(s), current: ${unresolvedCount}); boundary delta remains informational.`
        );
        for (const unresolved of baseline.unresolved)
          console.log(`  BASE UNRESOLVED ${unresolved}`);
      }
    } catch (error) {
      comparison = "base unavailable; informative only";
      console.warn(
        `Could not compare against base (${error.message}); boundary results remain informational.`
      );
    }
  }

  console.log(
    `Identity boundary scan: ${current.moduleCount} source module(s), ${currentFindings.length} production violation(s), ${countIdentityTestEdges(current.graph)} test edge(s) classified separately, ${current.unresolved.length} unresolved local edge(s).`
  );
  for (const unresolved of current.unresolved) console.log(`  UNRESOLVED ${unresolved}`);
  printFindings("Global diagnostic (informational)", currentFindings);
  console.log(`Comparison: ${comparison}.`);

  if (comparisonReliable) {
    const added = addedIdentityBoundaryFindings(currentFindings, baselineFindings);
    printFindings("New blocking delta", added);
    if (hasBlockingIdentityBoundaryDelta(comparisonReliable, currentFindings, baselineFindings)) {
      process.exitCode = 1;
    }
  } else {
    console.log(
      "No boundary findings block while the Git comparison is incomplete or unavailable."
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
