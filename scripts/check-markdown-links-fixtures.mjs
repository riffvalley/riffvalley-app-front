import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { newFailures, scanMarkdownRoot } from "./check-markdown-links.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "markdown-link-fixtures-"));
try {
  mkdirSync(path.join(root, "docs", "nested"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "docs", "Revisión ágil.md"),
    "# Revisión ágil\n\n# Revisión ágil\n"
  );
  writeFileSync(
    path.join(root, "src", "main.ts"),
    "export const value = 1;\nexport const second = 2;\nexport const third = 3;\n"
  );
  writeFileSync(
    path.join(root, "docs", "nested", "guide.md"),
    [
      "# Guía local",
      "",
      "[encoded relative](../Revisi%C3%B3n%20%C3%A1gil.md#revisi%C3%B3n-%C3%A1gil-1)",
      "[root path](/docs/Revisi%C3%B3n%20%C3%A1gil.md#revisi%C3%B3n-%C3%A1gil)",
      "[same file](#gu%C3%ADa-local)",
      "[code line](../../src/main.ts#L1-L3)",
      "[invalid code line](../../src/main.ts#L4-L8)",
      "[external](https://example.invalid/no-network#ignored)",
      "[broken anchor](../Revisi%C3%B3n%20%C3%A1gil.md#missing-section)",
      "[missing file](./missing.md)",
      "",
      "```md",
      "[ignored fenced link](./missing-in-code.md)",
      "```",
    ].join("\n")
  );

  const result = scanMarkdownRoot(root);
  assert.equal(result.files.length, 2, "Markdown parser scans the source documents");
  assert.equal(
    result.externalLinkCount,
    1,
    "external URLs are counted separately without a request"
  );
  assert.equal(result.failures.length, 3, "missing local target, anchor, and code line fail");
  assert(
    result.failures.some((failure) => failure.href.endsWith("#missing-section")),
    "missing anchors are detected"
  );
  assert(
    result.failures.some((failure) => failure.href.endsWith("missing.md")),
    "missing relative files are detected"
  );
  assert(
    result.failures.some((failure) => failure.href.endsWith("#L4-L8")),
    "out-of-range code anchors are detected"
  );
  const baseFailure = { source: "docs/guide.md", href: "./legacy.md", reason: "missing target" };
  const newFailure = { source: "docs/guide.md", href: "./new-broken.md", reason: "missing target" };
  assert.deepEqual(
    newFailures({ failures: [baseFailure] }, { failures: [baseFailure, newFailure] }, [
      "docs/guide.md",
    ]),
    [newFailure],
    "only newly broken links in changed Markdown are blocking"
  );
  assert.deepEqual(
    newFailures({ failures: [] }, { failures: [newFailure] }, ["docs/other.md"]),
    [],
    "failures in unchanged Markdown do not become blocking deltas"
  );
  console.log(
    "Markdown link fixtures passed (relative paths, encoded spaces/fragments, root paths, accents, duplicate headings, same-file anchors, code line anchors, external links, and code blocks)."
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
