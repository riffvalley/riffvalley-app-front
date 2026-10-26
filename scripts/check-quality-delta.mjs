import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ESLint } from "eslint";
import prettier from "prettier";

const [kind] = process.argv.slice(2);
if (!["lint", "format"].includes(kind)) {
  console.error("Usage: node scripts/check-quality-delta.mjs <lint|format>");
  process.exit(2);
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split("\n").filter(Boolean) : null;
}

const baseSha = process.env.FQ_QUALITY_BASE_SHA;
const headSha = process.env.FQ_QUALITY_HEAD_SHA;
let changedFiles;
let comparisonReliable = true;

if (baseSha && headSha) {
  changedFiles = git(["diff", "--name-only", "--diff-filter=ACMR", `${baseSha}...${headSha}`]);
  if (changedFiles === null) {
    comparisonReliable = false;
    console.warn(
      "Could not compare the base and head revisions; running an informational Identity scan."
    );
    changedFiles = git(["ls-files", "src/modules/identity"]) ?? [];
  }
}

if (!baseSha || !headSha) {
  const tracked = git(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]) ?? [];
  const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]) ?? [];
  const untracked = git(["ls-files", "--others", "--exclude-standard"]) ?? [];
  changedFiles = [...new Set([...tracked, ...staged, ...untracked])];
}

const identityFiles = changedFiles.filter(
  (file) =>
    file.startsWith("src/modules/identity/") && (file.endsWith(".ts") || file.endsWith(".vue"))
);

if (identityFiles.length === 0) {
  console.log("No changed TypeScript or Vue files in src/modules/identity; check skipped.");
  process.exit(0);
}

console.log(
  comparisonReliable
    ? `Checking ${identityFiles.length} changed Identity source file(s).`
    : `Scanning ${identityFiles.length} Identity source file(s) informatively.`
);
if (kind === "lint") {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(identityFiles);
  const formatter = await eslint.loadFormatter("stylish");
  const output = formatter.format(results);
  if (output) console.log(output);

  const errors = results.reduce((total, result) => total + result.errorCount, 0);
  const warnings = results.reduce((total, result) => total + result.warningCount, 0);
  console.log(`Lint result: ${errors} error(s), ${warnings} warning(s).`);
  process.exit(comparisonReliable && errors > 0 ? 1 : 0);
}

let unformattedFiles = 0;
for (const file of identityFiles) {
  const source = await readFile(file, "utf8");
  const options = { ...(await prettier.resolveConfig(file)), filepath: file };
  if (!(await prettier.check(source, options))) {
    console.log(`Not formatted: ${file}`);
    unformattedFiles += 1;
  }
}

console.log(`Format result: ${unformattedFiles} file(s) need formatting.`);
process.exit(comparisonReliable && unformattedFiles > 0 ? 1 : 0);
