import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/check-native-versions.mjs';

function fixtures(spmVersion, podVersion) {
  const dir = mkdtempSync(join(tmpdir(), 'khipu-versions-'));
  const packageSwift = join(dir, 'Package.swift');
  const podspec = join(dir, 'CapacitorKhipu.podspec');

  writeFileSync(
    packageSwift,
    `.package(url: "https://github.com/khipu/KhipuClientIOS.git", exact: "${spmVersion}")\n`,
  );
  writeFileSync(podspec, `  s.dependency 'KhipuClientIOS', '${podVersion}'\n`);

  return [packageSwift, podspec];
}

function run(args) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

describe('check-native-versions', () => {
  it('passes when both versions match', () => {
    const result = run(fixtures('2.16.5', '2.16.5'));

    expect(result.code).toBe(0);
    expect(result.output).toContain('2.16.5');
  });

  it('fails when the versions differ', () => {
    const result = run(fixtures('2.16.5', '2.16.2'));

    expect(result.code).toBe(1);
    expect(result.output).toContain('out of sync');
  });

  it('fails when it cannot find the version in Package.swift', () => {
    const [, podspec] = fixtures('2.16.5', '2.16.5');
    const dir = mkdtempSync(join(tmpdir(), 'khipu-versions-'));
    const packageSwift = join(dir, 'Package.swift');
    writeFileSync(packageSwift, 'let package = Package(name: "CapacitorKhipu")\n');

    const result = run([packageSwift, podspec]);

    expect(result.code).toBe(1);
    expect(result.output).toContain('not found');
  });

  it("with the repo's real files the versions are in sync", () => {
    expect(run([]).code).toBe(0);
  });
});
