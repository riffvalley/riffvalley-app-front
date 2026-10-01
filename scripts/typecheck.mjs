import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const BASELINE_PATH = "docs/typecheck-baseline.json";
const PROJECT = "tsconfig.app.json";

/** Canonicalize only runs of string-literal union members in TypeScript messages. */
function normalizeUnionMemberOrder(message) {
  const stringLiteral = "(?:\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')";
  const literalUnion = new RegExp(stringLiteral + "(?:\\s*\\|\\s*" + stringLiteral + ")+", "g");
  const stringMember = new RegExp(stringLiteral, "g");
  return message.replace(literalUnion, (union) =>
    (union.match(stringMember) ?? [])
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
      .join(" | "));
}

function signature(diagnostic) {
  return JSON.stringify([
    diagnostic.file,
    diagnostic.code,
    normalizeUnionMemberOrder(diagnostic.message),
    diagnostic.source,
  ]);
}

function normalizeMessage(message, root) {
  return message.replaceAll(root.replaceAll("\\", "/"), "<repo>").replaceAll(root, "<repo>").trim();
}

/** Keep diagnostic identity and multiplicity, but permit harmless line movement. */
export function parseDiagnostics(output, root) {
  const entries = [];
  let current;
  for (const line of output.replaceAll("\r\n", "\n").split("\n")) {
    const match = /^(.*?)\((\d+),(\d+)\): error TS(\d+): (.*)$/.exec(line);
    if (match) {
      const [, filename, row, column, code, message] = match;
      const file = path.relative(root, path.resolve(root, filename)).replaceAll("\\", "/");
      if (!file.startsWith("src/")) throw new Error(`Diagnóstico fuera de src: ${line}`);
      const lines = fs.readFileSync(path.resolve(root, file), "utf8").split(/\r?\n/);
      const source = lines[Number(row) - 1];
      if (source === undefined) throw new Error(`Posición de diagnóstico inválida: ${line}`);
      current = { file, code: Number(code), message, source: source.trim(), line: Number(row), column: Number(column) };
      entries.push(current);
    } else if (line.trim()) {
      if (!current || !/^\s/.test(line)) throw new Error(`Salida de vue-tsc no reconocida: ${line}`);
      current.message += `\n${line}`;
    }
  }
  return entries.map((entry) => ({
    ...entry,
    message: normalizeUnionMemberOrder(normalizeMessage(entry.message, root)),
  }));
}

export function baselineFrom(diagnostics) {
  const grouped = new Map();
  for (const { file, code, message, source } of diagnostics) {
    const entry = { file, code, message: normalizeUnionMemberOrder(message), source, count: 1 };
    const key = signature(entry);
    const previous = grouped.get(key);
    if (previous) previous.count++;
    else grouped.set(key, entry);
  }
  const diagnosticsBySignature = [...grouped.values()].sort((a, b) => signature(a).localeCompare(signature(b), "en"));
  return { version: 1, project: PROJECT, diagnostics: diagnosticsBySignature };
}

export function readBaseline(text) {
  const baseline = JSON.parse(text);
  if (baseline.version !== 1 || baseline.project !== PROJECT || !Array.isArray(baseline.diagnostics)) {
    throw new Error("Formato de baseline de TypeScript inválido");
  }
  const seen = new Set();
  for (const entry of baseline.diagnostics) {
    if (typeof entry.file !== "string" || !entry.file.startsWith("src/") || entry.file.includes("..") || /[*?]/.test(entry.file) ||
        !Number.isInteger(entry.code) || typeof entry.message !== "string" || typeof entry.source !== "string" ||
        !Number.isInteger(entry.count) || entry.count < 1 || seen.has(signature(entry))) {
      throw new Error("Entrada de baseline de TypeScript inválida o duplicada");
    }
    seen.add(signature(entry));
  }
  return baseline;
}

/** The candidate must be a multiset subset: no replacement or larger counts. */
export function baselineAdditions(candidate, allowed) {
  const counts = new Map(allowed.diagnostics.map((entry) => [signature(entry), entry.count]));
  return candidate.diagnostics.filter((entry) => entry.count > (counts.get(signature(entry)) ?? 0));
}

export function compareDiagnostics(diagnostics, baseline) {
  const current = baselineFrom(diagnostics);
  return { added: baselineAdditions(current, baseline), resolved: baselineAdditions(baseline, current), current };
}

export function runCompiler(root) {
  const compiler = createRequire(import.meta.url).resolve("vue-tsc/bin/vue-tsc.js");
  const result = spawnSync(process.execPath, [compiler, "--noEmit", "-p", PROJECT, "--pretty", "false", "--noErrorTruncation"], {
    cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.signal || ![0, 1, 2].includes(result.status) || result.stderr.trim()) {
    throw new Error(`vue-tsc no pudo completarse: ${result.stderr || result.signal || result.status}`);
  }
  const diagnostics = parseDiagnostics(result.stdout, root);
  if ((result.status === 0) !== (diagnostics.length === 0)) {
    throw new Error("Estado de vue-tsc incompatible con sus diagnósticos; no se acepta un fallo sin analizar");
  }
  return diagnostics;
}

export function committedBaseline(root, reference) {
  const commit = spawnSync("git", ["rev-parse", "--verify", `${reference}^{commit}`], { cwd: root, encoding: "utf8" });
  if (commit.status !== 0) throw new Error(`Referencia de baseline inaccesible: ${reference}. CI necesita el historial de Git.`);
  const ref = `${commit.stdout.trim()}:${BASELINE_PATH}`;
  const exists = spawnSync("git", ["ls-tree", "--name-only", commit.stdout.trim(), "--", BASELINE_PATH], { cwd: root, encoding: "utf8" });
  if (exists.status !== 0) throw new Error(`No se pudo comprobar el baseline de ${reference}`);
  // Only the initial adoption has no baseline in the reference commit.
  if (!exists.stdout.trim()) return null;
  const previous = spawnSync("git", ["show", ref], { cwd: root, encoding: "utf8" });
  if (previous.status !== 0) throw new Error(`No se pudo leer el baseline de ${reference}`);
  return readBaseline(previous.stdout);
}

export function checkTypeScript(root, { prune = false, reference = "HEAD" } = {}) {
  const baselineFile = path.join(root, BASELINE_PATH);
  const baseline = readBaseline(fs.readFileSync(baselineFile, "utf8"));
  const previous = committedBaseline(root, reference);
  if (previous && baselineAdditions(baseline, previous).length) {
    throw new Error(`El baseline solo puede reducirse respecto a ${reference}; hay excepciones nuevas o ampliadas`);
  }
  const diagnostics = runCompiler(root);
  const { added, resolved, current } = compareDiagnostics(diagnostics, baseline);
  if (added.length) {
    const summary = added.map((entry) => {
      const location = diagnostics.find((diagnostic) => signature(diagnostic) === signature(entry));
      return `${entry.file}:${location.line}:${location.column} TS${entry.code}: ${entry.message}\n  ${entry.source}`;
    }).join("\n");
    throw new Error(`Nuevas regresiones de TypeScript:\n${summary}`);
  }
  if (prune) fs.writeFileSync(baselineFile, `${JSON.stringify(current, null, 2)}\n`);
  else if (resolved.length) {
    throw new Error("Hay diagnósticos resueltos. Elimina sus excepciones con yarn typecheck:baseline:prune y vuelve a comprobar.");
  }
  return diagnostics.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some((argument) => argument !== "--prune-baseline")) throw new Error("Argumento de typecheck desconocido");
    const count = checkTypeScript(process.cwd(), {
      prune: process.argv.includes("--prune-baseline"), reference: process.env.TYPECHECK_BASE_REF || "HEAD",
    });
    process.stdout.write(`TypeScript: src comprobado con ${PROJECT}; ${count} diagnósticos baseline, 0 regresiones.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
