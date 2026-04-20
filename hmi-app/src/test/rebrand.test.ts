import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve paths relative to this file: hmi-app/src/test/rebrand.test.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HMI_APP   = path.resolve(__dirname, '../..');   // hmi-app/
const REPO_ROOT = path.resolve(__dirname, '../../..'); // interfaz-laboratorio/

// NOTE: The pattern string is split to avoid this file matching itself.
const PATTERN = new RegExp('s' + 'teigen', 'i');

interface Violation {
  file: string;
  line: number;
  content: string;
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function violations(filePath: string): Violation[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  return lines.flatMap((line, idx) =>
    PATTERN.test(line)
      ? [{ file: filePath, line: idx + 1, content: line.trim() }]
      : [],
  );
}

function assertClean(files: string[]): void {
  const found = files.flatMap(violations);
  if (found.length > 0) {
    const detail = found
      .map(v => `  ${v.file}:${v.line}: ${v.content}`)
      .join('\n');
    const label = 'brand' + ' string found after rebrand';
    expect.fail(`${label}:\n${detail}`);
  }
  expect(found).toHaveLength(0);
}

// =============================================================================
// Post-rebrand assertion tests
// These tests MUST stay green: any old-brand string in the live surfaces
// (src, index.html, AGENTS.md, implementation_plan.md) is a CI failure.
// Exempt: openspec/changes/canvas-bounds/explore.md (historical artifact).
// This file exempts itself from the src scan (it necessarily contains the
// pattern as a runtime string to search for).
// =============================================================================

describe('Post-rebrand assertion — no old-brand strings in live surfaces', () => {
  it('hmi-app/src/** contains no old-brand string (self-exempt)', () => {
    const thisFile = __filename;
    const allowedLegacyFiles = new Set([
      path.resolve(HMI_APP, 'src/utils/legacyStorageCleanup.ts'),
      path.resolve(HMI_APP, 'src/utils/legacyStorageCleanup.test.ts'),
    ]);
    const files = collectFiles(path.join(HMI_APP, 'src'))
      .filter(f => path.resolve(f) !== path.resolve(thisFile))
      .filter(f => !allowedLegacyFiles.has(path.resolve(f)));
    assertClean(files);
  });

  it('hmi-app/index.html contains no old-brand string', () => {
    assertClean([path.join(HMI_APP, 'index.html')]);
  });

  it('AGENTS.md contains no old-brand string', () => {
    assertClean([path.join(REPO_ROOT, 'AGENTS.md')]);
  });

  it('implementation_plan.md contains no old-brand string', () => {
    assertClean([path.join(REPO_ROOT, 'implementation_plan.md')]);
  });
});
