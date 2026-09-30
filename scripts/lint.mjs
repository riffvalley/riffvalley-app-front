import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.ESLINT_USE_FLAT_CONFIG = "true";

const eslintApi = fileURLToPath(import.meta.resolve("eslint"));
const eslintBin = path.resolve(path.dirname(eslintApi), "../bin/eslint.js");
const result = spawnSync(process.execPath, [eslintBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
