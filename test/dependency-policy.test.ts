import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'vitest'

const checker = resolve('scripts/check-dependency-policy.mjs')

test('actual install policies pass and expired generated exceptions fail before installation', () => {
  for (const path of [
    'pnpm-workspace.yaml',
    'test/fixtures/fresh-install/pnpm-workspace.yaml',
    'test/fixtures/fresh-install-default/pnpm-workspace.yaml',
  ]) {
    const result = spawnSync(process.execPath, [checker, resolve(path)], { encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
  }

  const directory = mkdtempSync(join(tmpdir(), 'nuxt-email-policy-'))
  try {
    const path = join(directory, 'pnpm-workspace.yaml')
    const policy = readFileSync('test/fixtures/fresh-install/pnpm-workspace.yaml', 'utf8')
    writeFileSync(path, `${policy}\nminimumReleaseAgeExclude:\n  - 'example@1.2.3' # {"reason":"fixture","owner":"test","expires":"2000-01-01T00:00:00Z"}\n`)
    const expired = spawnSync(process.execPath, [checker, path], { encoding: 'utf8' })
    expect(expired.status).toBe(1)
    expect(expired.stderr).toContain('exception expired')
    writeFileSync(path, policy.replace('minimumReleaseAgeStrict: true', 'minimumReleaseAgeStrict: false'))
    const weakened = spawnSync(process.execPath, [checker, path], { encoding: 'utf8' })
    expect(weakened.status).toBe(1)
    expect(weakened.stderr).toContain('minimumReleaseAgeStrict')
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
