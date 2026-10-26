import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import MarkdownIt from "markdown-it";
import GithubSlugger from "github-slugger";

const markdown = new MarkdownIt({ html: true, linkify: true });
const ignoredDirectories = new Set([".git", "node_modules"]);

function markdownFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : markdownFiles(root, absolute);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith(".md") ? [absolute] : [];
  });
}

function inlineText(tokens = []) {
  return tokens
    .map((token) => {
      if (token.type === "text" || token.type === "code_inline") return token.content;
      if (token.type === "image") return token.attrGet("alt") ?? "";
      if (token.type === "softbreak" || token.type === "hardbreak") return " ";
      return "";
    })
    .join("");
}

function anchorsFor(source) {
  const anchors = new Set();
  const slugger = new GithubSlugger();
  const tokens = markdown.parse(source, {});
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "heading_open" && tokens[index + 1]?.type === "inline") {
      anchors.add(slugger.slug(inlineText(tokens[index + 1].children)));
    }
    if (token.type === "html_block" || token.type === "html_inline") {
      for (const match of token.content.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)) {
        anchors.add(match[2]);
      }
    }
  }
  anchors.add("top");
  return anchors;
}

function lineFor(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function decodeFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

function resolveLocalLink({ root, sourcePath, href, line, sourceText }) {
  if (!href || href.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(href)) return null;

  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const pathEnd =
    [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? href.length;
  const encodedPath = href.slice(0, pathEnd);
  const rawFragment = hashIndex >= 0 ? href.slice(hashIndex + 1).split("?")[0] : "";
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(encodedPath);
  } catch {
    return { sourcePath, line, href, reason: "invalid percent encoding" };
  }

  const targetPath = decodedPath.startsWith("/")
    ? path.resolve(root, `.${decodedPath}`)
    : path.resolve(path.dirname(sourcePath), decodedPath || path.basename(sourcePath));
  const relativeTarget = path.relative(root, targetPath);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    return { sourcePath, line, href, reason: "target is outside the repository" };
  }
  if (!pathExists(targetPath))
    return { sourcePath, line, href, reason: `missing target ${relativeTarget || "."}` };

  let anchorTarget = targetPath;
  if (statSync(targetPath).isDirectory()) {
    anchorTarget = path.join(targetPath, "README.md");
    if (!pathExists(anchorTarget)) {
      return rawFragment
        ? { sourcePath, line, href, reason: "directory has no README.md for fragment" }
        : null;
    }
  }
  if (!rawFragment) return null;

  const fragment = decodeFragment(rawFragment);
  const targetText = anchorTarget === sourcePath ? sourceText : readFileSync(anchorTarget, "utf8");
  const lineAnchor = fragment.match(/^L(\d+)(?:-L(\d+))?$/i);
  if (lineAnchor) {
    const startLine = Number(lineAnchor[1]);
    const endLine = Number(lineAnchor[2] ?? lineAnchor[1]);
    const totalLines =
      targetText.length === 0
        ? 0
        : targetText.split(/\r\n?|\n/).length - (/(?:\r\n?|\n)$/.test(targetText) ? 1 : 0);
    if (startLine > 0 && endLine >= startLine && endLine <= totalLines) return null;
    return {
      sourcePath,
      line,
      href,
      reason: `line anchor #${fragment} is outside the target file`,
    };
  }
  if (path.extname(anchorTarget).toLowerCase() !== ".md") {
    return {
      sourcePath,
      line,
      href,
      reason: `unsupported anchor #${fragment} on a non-Markdown target`,
    };
  }
  const markdownTarget = targetText;
  const anchors = anchorsFor(markdownTarget);
  if (!anchors.has(fragment)) {
    return { sourcePath, line, href, reason: `missing anchor #${fragment}` };
  }
  return null;
}

function pathExists(target) {
  try {
    statSync(target);
    return true;
  } catch {
    return false;
  }
}

export function scanMarkdownRoot(root) {
  const failures = [];
  let markdownLinkCount = 0;
  let externalLinkCount = 0;
  const files = markdownFiles(root).sort();

  for (const sourcePath of files) {
    const sourceText = readFileSync(sourcePath, "utf8");
    const tokens = markdown.parse(sourceText, {});
    for (const token of tokens) {
      if (token.type !== "inline" || !token.children) continue;
      let offset = 0;
      for (const child of token.children) {
        const href =
          child.type === "link_open"
            ? child.attrGet("href")
            : child.type === "image"
              ? child.attrGet("src")
              : null;
        if (!href) continue;
        markdownLinkCount += 1;
        if (href.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(href)) {
          externalLinkCount += 1;
          continue;
        }
        const found = resolveLocalLink({
          root,
          sourcePath,
          href,
          line: token.map ? token.map[0] + 1 : lineFor(sourceText, offset),
          sourceText,
        });
        if (found) failures.push({ ...found, source: path.relative(root, sourcePath) });
        offset += token.content.length;
      }
    }
  }
  return {
    files: files.map((file) => path.relative(root, file)),
    failures,
    markdownLinkCount,
    externalLinkCount,
  };
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function snapshotRevision(revision, parent) {
  const directory = path.join(parent, revision.replace(/[^a-z\d]/gi, "_").slice(0, 24));
  mkdirSync(directory, { recursive: true });
  const archive = execFileSync("git", ["archive", revision], {
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
  const archivePath = path.join(parent, `${path.basename(directory)}.tar`);
  writeFileSync(archivePath, archive);
  execFileSync("tar", ["-xf", archivePath, "-C", directory]);
  return directory;
}

export function newFailures(baseResult, headResult, changedFiles) {
  const baselineFailures = new Set(
    baseResult.failures.map((item) => `${item.source}:${item.href}:${item.reason}`)
  );
  return headResult.failures.filter(
    (item) =>
      changedFiles.includes(item.source) &&
      !baselineFailures.has(`${item.source}:${item.href}:${item.reason}`)
  );
}

function report(label, result) {
  console.log(
    `${label}: ${result.files.length} Markdown file(s), ${result.markdownLinkCount} link(s), ${result.externalLinkCount} external link(s), ${result.failures.length} local failure(s).`
  );
  for (const failure of result.failures) {
    console.log(`  ${failure.source}:${failure.line}: ${failure.href} — ${failure.reason}`);
  }
}

function runFullScan() {
  const root = process.cwd();
  const result = scanMarkdownRoot(root);
  report("Markdown link scan (informational baseline)", result);
}

function runDelta() {
  const base = process.env.FQ_QUALITY_BASE_SHA;
  const head = process.env.FQ_QUALITY_HEAD_SHA;
  if (!base || !head || git(["status", "--porcelain"])) {
    console.log(
      "Markdown link delta is informational: complete base/head SHAs and a clean checkout are required."
    );
    return;
  }

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "markdown-link-delta-"));
  try {
    let baseRoot;
    let headRoot;
    let changed;
    try {
      git(["merge-base", base, head]);
      baseRoot = snapshotRevision(base, tempRoot);
      headRoot = snapshotRevision(head, tempRoot);
      changed = git(["diff", "--name-only", `${base}...${head}`, "--", "*.md"])
        .split("\n")
        .filter(Boolean);
    } catch (error) {
      console.log(
        `Markdown link delta is informational: Git cannot provide a complete base/head comparison (${error.message.split("\n")[0]}).`
      );
      return;
    }
    if (!changed.length) {
      console.log("Markdown link delta: no Markdown files changed.");
      return;
    }

    const baseResult = scanMarkdownRoot(baseRoot);
    const headResult = scanMarkdownRoot(headRoot);
    const added = newFailures(baseResult, headResult, changed);
    console.log(
      `Markdown link delta: ${changed.length} changed Markdown file(s), ${added.length} new local failure(s).`
    );
    for (const failure of added)
      console.log(`  ${failure.source}:${failure.line}: ${failure.href} — ${failure.reason}`);
    if (added.length) process.exitCode = 1;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  const mode = process.argv[2] ?? "report";
  try {
    if (mode === "report") runFullScan();
    else if (mode === "delta") runDelta();
    else throw new Error(`Unknown mode: ${mode}`);
  } catch (error) {
    console.error(`Markdown link checker failed: ${error.message}`);
    process.exitCode = 2;
  }
}
