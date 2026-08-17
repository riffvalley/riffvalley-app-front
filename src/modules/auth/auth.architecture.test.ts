import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('auth module boundary', () => {
  it('allows external consumers to import only the public entry point', () => {
    const src = resolve(process.cwd(), 'src');
    const offenders = files(src).filter((file) => !file.includes('/modules/auth/')).filter((file) => /from ['"]@\/modules\/auth\//.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
