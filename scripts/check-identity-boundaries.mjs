import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { scanGitRevision, scanGraph } from "./check-cycles.mjs";
import { evaluateComparison } from "./quality-comparison.mjs";

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
  if (result.error || result.status !== 0) {
    return {
      error: result.error ?? new Error(result.stderr?.trim() || `git ${args[0]} failed`),
    };
  }
  return { stdout: result.stdout.trim() };
}

function printFindings(label, findings) {
  console.log(`${label}: ${findings.length} production violation(s).`);
  for (const finding of findings) {
    console.log(`  ${finding.kind}: ${finding.from} -> ${finding.to}`);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const required = args.includes("--required");
  if (args.some((arg) => arg !== "--required")) {
    console.error("Usage: node scripts/check-identity-boundaries.mjs [--required]");
    process.exitCode = 2;
    return;
  }

  let baseSha = process.env.FQ_QUALITY_BASE_SHA;
  let headSha = process.env.FQ_QUALITY_HEAD_SHA;
  let referenceError;

  if (required && (!baseSha || !headSha)) {
    const outcome = evaluateComparison({
      control: "Identity boundary",
      required,
      baseSha,
      headSha,
    });
    console.error(outcome.message);
    process.exitCode = outcome.exitCode;
    return;
  }

  if (baseSha && headSha) {
    const mergeBase = runGit(["merge-base", baseSha, headSha]);
    if (mergeBase.error || !mergeBase.stdout) {
      referenceError = `could not resolve merge base for ${baseSha} and ${headSha}`;
      baseSha = undefined;
    } else {
      baseSha = mergeBase.stdout;
    }
  } else {
    const head = runGit(["rev-parse", "HEAD"]);
    if (head.error || !head.stdout) {
      referenceError = "could not resolve local HEAD";
      baseSha = undefined;
      headSha = undefined;
    } else {
      baseSha = head.stdout;
      headSha = baseSha;
    }
  }

  let current;
  try {
    current = await scanGraph();
  } catch (error) {
    console.error(
      required
        ? `Required Identity boundary comparison failed: analyzer failed (${error.message}).`
        : `Identity boundary scan failed: ${error.message}`
    );
    process.exitCode = 2;
    return;
  }

  const currentFindings = collectIdentityBoundaryFindings(current.graph);
  let baselineFindings;
  let baseline;
  let analysisError;

  if (baseSha) {
    try {
      baseline = await scanGitRevision(baseSha);
      baselineFindings = collectIdentityBoundaryFindings(baseline.graph);
    } catch (error) {
      analysisError = `could not scan base graph (${error.message})`;
    }
  }

  const added = baselineFindings
    ? addedIdentityBoundaryFindings(currentFindings, baselineFindings)
    : [];
  const outcome = evaluateComparison({
    control: "Identity boundary",
    required,
    baseSha,
    headSha,
    baseline,
    current,
    regressionCount: added.length,
    regressionDescription: "new production violation(s)",
    referenceError,
    analysisError,
  });

  console.log(
    `Identity boundary scan: ${current.moduleCount} source module(s), ${currentFindings.length} production violation(s), ${countIdentityTestEdges(current.graph)} test edge(s) classified separately, ${current.unresolved.length} unresolved local edge(s).`
  );
  for (const unresolved of current.unresolved) console.log(`  UNRESOLVED ${unresolved}`);
  printFindings("Current production findings", currentFindings);
  console.log(`Comparison: ${outcome.status}.`);

  if (outcome.reliable) {
    printFindings("New blocking delta", added);
  }
  console.log(outcome.message);
  process.exitCode = outcome.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
