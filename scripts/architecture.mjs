import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { parse as parseSfc } from "@vue/compiler-sfc";

const ROOTS = ["src/app", "src/modules", "src/shared", "src/integrations"];
const FRAMEWORK_IMPORT = /^(vue|pinia|vue-router)(\/|$)|^@(?:\/)?(?:stores|router)(\/|$)/;
const HTTP_IMPORT = /^(axios|@services\/|@\/services\/|\/src\/services\/)/;
const PROVIDER_IMPORT = /(spotify|lastfm|language.?tool)/i;
const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "fetch",
  "XMLHttpRequest",
]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(fullPath)
      : /\.(?:ts|vue)$/.test(entry.name)
        ? [fullPath]
        : [];
  });
}

function sourceFor(filePath, text) {
  if (!filePath.endsWith(".vue")) return text;
  const { descriptor, errors } = parseSfc(text, { filename: filePath });
  if (errors.length) return "";
  const block = descriptor.scriptSetup ?? descriptor.script;
  return block?.content ?? "";
}

function moduleAndLayer(filePath) {
  const normalized = filePath.replaceAll(path.sep, "/");
  const match = normalized.match(/^src\/modules\/([^/]+)\/(presentation|application|domain|infrastructure)\//);
  return match ? { module: match[1], layer: match[2] } : null;
}

function layerOf(filePath) {
  return moduleAndLayer(filePath)?.layer ?? null;
}

function importsFrom(sourceFile) {
  const result = [];
  const add = (node, value) => {
    if (value && ts.isStringLiteralLike(value)) result.push({ specifier: value.text, node });
  };

  for (const statement of sourceFile.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier) {
      add(statement, statement.moduleSpecifier);
    }
  }

  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node, node.arguments[0]);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      add(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function moduleFromSpecifier(specifier, importer) {
  const normalized = specifier.startsWith("@/modules/")
    ? `src/modules/${specifier.slice("@/modules/".length)}`
    : specifier.startsWith("@modules/")
      ? `src/modules/${specifier.slice("@modules/".length)}`
    : specifier.startsWith("modules/")
      ? `src/${specifier}`
      : specifier.startsWith(".")
        ? path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier))
        : null;
  if (!normalized) return null;
  const match = normalized.match(/^src\/modules\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

function resolveLocalImport(specifier, importer, fileSet) {
  let base;
  if (specifier.startsWith("@/")) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith("@modules/")) base = `src/modules/${specifier.slice("@modules/".length)}`;
  else if (specifier.startsWith("@shared/")) base = `src/shared/${specifier.slice("@shared/".length)}`;
  else if (specifier.startsWith("@app/")) base = `src/app/${specifier.slice("@app/".length)}`;
  else if (specifier.startsWith("@")) {
    const aliases = ["stores", "views", "components", "services", "interfaces", "helpers", "assets"];
    const alias = aliases.find((candidate) => specifier.startsWith(`@${candidate}/`));
    if (alias) base = `src/${alias}/${specifier.slice(alias.length + 2)}`;
  } else if (specifier.startsWith(".")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  }
  if (!base) return null;
  const candidates = path.extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, `${base}.vue`, `${base}/index.ts`, `${base}/index.vue`];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function lineAt(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function analyzeFiles(files) {
  const diagnostics = [];
  const parsed = new Map();
  const fileSet = new Set(Object.keys(files));

  for (const [filePath, rawText] of Object.entries(files)) {
    const text = sourceFor(filePath, rawText);
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    parsed.set(filePath, { sourceFile, text });
    const owner = moduleAndLayer(filePath);
    const isApp = filePath.startsWith("src/app/");
    const isArchitectureCode = isApp || filePath.startsWith("src/modules/") ||
      filePath.startsWith("src/shared/") || filePath.startsWith("src/integrations/");
    const allowsInfrastructure = owner?.layer === "infrastructure" ||
      filePath.startsWith("src/shared/infrastructure/") || filePath.startsWith("src/integrations/");
    const add = (node, message) => diagnostics.push(`${filePath}:${lineAt(sourceFile, node)} ${message}`);

    for (const imported of importsFrom(sourceFile)) {
      const targetModule = moduleFromSpecifier(imported.specifier, filePath);
      const resolvedTarget = resolveLocalImport(imported.specifier, filePath, fileSet);
      const targetLayer = resolvedTarget ? layerOf(resolvedTarget) : null;
      const isLegacyHttpService = HTTP_IMPORT.test(imported.specifier) ||
        resolvedTarget?.startsWith("src/services/");

      if (owner && resolvedTarget?.startsWith("src/app/")) {
        add(imported.node, "un módulo no puede depender del composition root app");
      }
      if (filePath.startsWith("src/shared/") &&
        (targetModule || resolvedTarget?.startsWith("src/app/"))) {
        add(imported.node, "shared no puede depender de un módulo ni de app");
      }
      if (targetModule && owner?.module !== targetModule) {
        const publicEntry = new RegExp(`^(?:(?:@/|@)?modules/)${targetModule}(?:/index(?:\\.[cm]?[jt]sx?)?)?$`).test(imported.specifier);
        if (!publicEntry) add(imported.node, `importa internals del módulo ${targetModule}`);
        if (owner && ["domain", "application"].includes(owner.layer)) {
          add(imported.node, `la capa ${owner.layer} no puede depender de otro módulo (${targetModule})`);
        }
      }

      if (owner && targetModule === owner.module && targetLayer) {
        const allowedLayers = {
          presentation: new Set(["presentation", "application", "domain"]),
          application: new Set(["application", "domain"]),
          domain: new Set(["domain"]),
          infrastructure: new Set(["infrastructure", "application", "domain"]),
        }[owner.layer];
        if (!allowedLayers.has(targetLayer)) {
          add(imported.node, `la capa ${owner.layer} no puede depender de ${targetLayer}`);
        }
      }

      if (isArchitectureCode && !allowsInfrastructure && isLegacyHttpService) {
        add(imported.node, "HTTP y servicios legacy solo se permiten detrás de infrastructure");
      }

      if (owner && ["domain", "application"].includes(owner.layer) && FRAMEWORK_IMPORT.test(imported.specifier)) {
        add(imported.node, `la capa ${owner.layer} no puede importar Vue, Pinia ni Vue Router`);
      }

      if (owner?.layer === "presentation" && PROVIDER_IMPORT.test(imported.specifier)) {
        add(imported.node, "presentation no puede importar SDKs de proveedores externos");
      }
    }

    const visit = (node) => {
      if (owner && ["domain", "application"].includes(owner.layer)) {
        if (ts.isIdentifier(node) && BROWSER_GLOBALS.has(node.text)) {
          add(node, `la capa ${owner.layer} no puede depender de APIs del navegador (${node.text})`);
        }
      }
      if (
        isArchitectureCode &&
        !allowsInfrastructure &&
        ((ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch") ||
          (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "XMLHttpRequest"))
      ) {
        add(node, "esta capa no puede realizar HTTP directamente; debe usar infrastructure");
      }
      if (isArchitectureCode && node.kind === ts.SyntaxKind.AnyKeyword) {
        add(node, "no se permite any nuevo en código arquitectónico");
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const graph = new Map();
  for (const [filePath, { sourceFile }] of parsed) {
    graph.set(filePath, importsFrom(sourceFile)
      .map(({ specifier }) => resolveLocalImport(specifier, filePath, fileSet))
      .filter((target) => target !== null));
  }

  const visited = new Set();
  const active = new Set();
  const reportedCycles = new Set();
  const visit = (filePath, stack) => {
    if (active.has(filePath)) {
      const cycle = stack.slice(stack.indexOf(filePath)).concat(filePath);
      const canonical = [...new Set(cycle)].sort().join(" -> ");
      if (!reportedCycles.has(canonical)) {
        reportedCycles.add(canonical);
        diagnostics.push(`ciclo relevante: ${cycle.join(" → ")}`);
      }
      return;
    }
    if (visited.has(filePath)) return;
    active.add(filePath);
    for (const target of graph.get(filePath) ?? []) visit(target, [...stack, filePath]);
    active.delete(filePath);
    visited.add(filePath);
  };
  for (const filePath of graph.keys()) visit(filePath, []);

  return diagnostics;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const files = Object.fromEntries(
    ROOTS.flatMap((root) => walk(root)).map((filePath) => [filePath, fs.readFileSync(filePath, "utf8")]),
  );
  const diagnostics = analyzeFiles(files);
  if (diagnostics.length) {
    process.stderr.write(`${diagnostics.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Arquitectura correcta en ${Object.keys(files).length} archivo(s) verificado(s).\n`);
  }
}
