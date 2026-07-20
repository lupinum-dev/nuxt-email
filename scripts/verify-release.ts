import { execFile } from 'node:child_process'
import { COPYFILE_EXCL } from 'node:constants'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

interface PackageManifest {
  name?: unknown
  version?: unknown
  description?: unknown
  license?: unknown
  type?: unknown
  main?: unknown
  packageManager?: unknown
  files?: unknown
  engines?: Record<string, unknown>
  exports?: Record<string, unknown>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

interface CommandResult {
  durationMilliseconds: number
  stderr: string
  stdout: string
}

interface PnpmModulesState {
  storeDir?: unknown
}

interface RenderedEmail {
  html: string
  text: string
}

interface FreshConsumerResult {
  freshInstallMilliseconds: number
  h3Resolution: string
  htmlBytes: number
  packageResolution: string
  requiredNetworkFallback: boolean
  run: number
  textBytes: number
  timingsMilliseconds: Record<string, number>
  vueServerRendererResolution: string
}

const executeFile = promisify(execFile)
const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const fixtureRoot = fileURLToPath(new URL('../test/fixtures/fresh-install', import.meta.url))
const maximumFreshInstallMilliseconds = 10 * 60 * 1_000
const textFilePattern = /\.(?:css|d\.ts|html|js|json|map|mjs|mts|txt)$/

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function displayArgument(argument: string): string {
  return /^[\w./:=@+-]+$/.test(argument) ? argument : JSON.stringify(argument)
}

function requestedArtifactPath(arguments_: readonly string[]): string | undefined {
  if (arguments_.length === 0) {
    return undefined
  }

  const [flag, requestedPath] = arguments_
  invariant(
    arguments_.length === 2
    && flag === '--output'
    && typeof requestedPath === 'string'
    && requestedPath.trim().length > 0,
    'Usage: pnpm release:verify [--output <path-to-tarball.tgz>]',
  )
  const outputPath = resolve(process.cwd(), requestedPath)
  invariant(outputPath.endsWith('.tgz'), 'Release artifact output path must end in .tgz')
  return outputPath
}

async function run(
  command: string,
  arguments_: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = {},
  timeoutMilliseconds?: number,
): Promise<CommandResult> {
  const renderedCommand = [command, ...arguments_].map(displayArgument).join(' ')
  process.stdout.write(`\n> ${renderedCommand}\n`)
  const startedAt = performance.now()

  try {
    const result = await executeFile(command, arguments_, {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'true',
        ...environment,
      },
      maxBuffer: 50 * 1024 * 1024,
      timeout: timeoutMilliseconds,
    })
    const durationMilliseconds = performance.now() - startedAt
    process.stdout.write(`  passed in ${(durationMilliseconds / 1_000).toFixed(2)}s\n`)

    return {
      durationMilliseconds,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  }
  catch (error) {
    const failure = error as Error & { stderr?: string, stdout?: string }
    const output = [failure.stdout, failure.stderr]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
    throw new Error(
      `Release verification command failed: ${renderedCommand}${output ? `\n${output.trim()}` : ''}`,
      { cause: error },
    )
  }
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  }))

  return files.flat().sort()
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child).replaceAll('\\', '/')
  return path === '' || (path !== '..' && !path.startsWith('../'))
}

function assertSafeArchiveEntries(entries: readonly string[]): void {
  invariant(entries.length > 0, 'Packed tarball is empty')

  for (const entry of entries) {
    const normalized = entry.replace(/^\.\//, '').replaceAll('\\', '/')
    invariant(normalized.startsWith('package/'), `Packed tarball contains an unexpected root entry: ${entry}`)
    invariant(!normalized.split('/').includes('..'), `Packed tarball contains a traversal entry: ${entry}`)
  }
}

function assertPackedMetadata(source: PackageManifest, packed: PackageManifest): void {
  invariant(packed.name === source.name && typeof packed.name === 'string', 'Packed package name differs from package.json')
  invariant(packed.version === source.version && typeof packed.version === 'string', 'Packed package version differs from package.json')
  invariant(typeof packed.description === 'string' && packed.description.trim().length > 0, 'Packed package needs a description')
  invariant(packed.license === 'MIT', 'Packed package license must be MIT')
  invariant(packed.type === 'module', 'Packed package must declare ESM with type="module"')
  invariant(packed.main === './dist/module.mjs', 'Packed package main entry must be ./dist/module.mjs')
  invariant(
    Array.isArray(packed.files)
    && packed.files.length === 2
    && packed.files.includes('dist')
    && packed.files.includes('THIRD_PARTY_NOTICES'),
    'Packed files allowlist must contain exactly dist and THIRD_PARTY_NOTICES',
  )
  invariant(typeof packed.engines?.node === 'string' && packed.engines.node.length > 0, 'Packed package must declare its supported Node range')

  const rootExport = packed.exports?.['.']
  invariant(typeof rootExport === 'object' && rootExport !== null, 'Packed package must export its module root')
  invariant('import' in rootExport && rootExport.import === './dist/module.mjs', 'Packed import export must point to ./dist/module.mjs')
  invariant('types' in rootExport && rootExport.types === './dist/types.d.mts', 'Packed type export must point to ./dist/types.d.mts')

  invariant(typeof packed.dependencies?.h3 === 'string', 'Packed preview handlers import h3, so h3 must be a direct runtime dependency')
  invariant(typeof packed.peerDependencies?.nuxt === 'string', 'Packed module must declare Nuxt as a peer dependency')
  invariant(typeof packed.peerDependencies?.vue === 'string', 'Packed renderer must declare Vue as a peer dependency')

  for (const [name, specifier] of Object.entries({
    ...packed.dependencies,
    ...packed.peerDependencies,
  })) {
    invariant(!/^(?:file|link|workspace):/.test(specifier), `Published dependency ${name} cannot use ${specifier}`)
  }
}

async function readTextOutput(directory: string): Promise<{ paths: string[], text: string }> {
  const files = await collectFiles(directory)
  const textFiles = files.filter(path => textFilePattern.test(path))
  const contents = await Promise.all(textFiles.map(path => readFile(path, 'utf8')))

  return {
    paths: files.map(path => relative(directory, path).replaceAll('\\', '/')),
    text: contents.join('\n'),
  }
}

async function verifyFreshConsumer(
  runNumber: number,
  temporaryRoot: string,
  tarballPath: string,
  workspaceStore: string,
  packedManifest: PackageManifest,
): Promise<FreshConsumerResult> {
  const consumerDirectory = join(temporaryRoot, `fresh-consumer-${runNumber}`)
  const timingsMilliseconds: Record<string, number> = {}
  await cp(fixtureRoot, consumerDirectory, { recursive: true })

  const consumerManifestPath = join(consumerDirectory, 'package.json')
  const consumerManifest = await readJson<PackageManifest & { dependencies: Record<string, string> }>(consumerManifestPath)
  invariant(consumerManifest.dependencies['nuxt-email'] === 'file:__NUXT_EMAIL_TARBALL__', 'Fresh-install fixture lost its tarball placeholder')
  consumerManifest.dependencies['nuxt-email'] = `file:${relative(consumerDirectory, tarballPath).replaceAll('\\', '/')}`
  await writeFile(consumerManifestPath, `${JSON.stringify(consumerManifest, null, 2)}\n`, 'utf8')

  process.stdout.write(`\n=== Fresh consumer ${runNumber} of 2 ===\n`)
  const freshInstallStartedAt = performance.now()
  const installStartedAt = performance.now()
  const installArguments = [
    'install',
    '--no-frozen-lockfile',
    '--no-hoist',
    '--package-import-method=copy',
    '--store-dir',
    workspaceStore,
  ]
  let requiredNetworkFallback = false
  try {
    await run('pnpm', [...installArguments, '--offline'], consumerDirectory)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('ERR_PNPM_NO_OFFLINE_TARBALL')) {
      throw error
    }

    requiredNetworkFallback = true
    const missingTarball = message.match(/missing package may be downloaded from (https?:\/\/\S+)/i)?.[1]?.replace(/\.$/, '')
    process.stdout.write(
      `  local pnpm store is incomplete${missingTarball ? `; missing ${missingTarball}` : ''}; retrying with prefer-offline\n`,
    )
    await rm(join(consumerDirectory, 'node_modules'), { recursive: true, force: true })
    await rm(join(consumerDirectory, 'pnpm-lock.yaml'), { force: true })
    await run('pnpm', [...installArguments, '--prefer-offline'], consumerDirectory)
  }
  timingsMilliseconds.install = performance.now() - installStartedAt

  const installedPackageRoot = await realpath(join(consumerDirectory, 'node_modules/nuxt-email'))
  invariant(isInside(temporaryRoot, installedPackageRoot), `Fresh install resolved nuxt-email outside its temporary app: ${installedPackageRoot}`)
  invariant(!isInside(packageRoot, installedPackageRoot), 'Fresh install resolved nuxt-email from the source checkout')
  invariant(!(await collectFiles(installedPackageRoot)).some(path => relative(installedPackageRoot, path).startsWith('src/')), 'Installed package contains source files')

  const installedManifest = await readJson<PackageManifest>(join(installedPackageRoot, 'package.json'))
  invariant(installedManifest.version === packedManifest.version, 'Installed package version differs from the packed tarball')

  const previewHandlerPath = join(installedPackageRoot, 'dist/runtime/server/preview-page.get.js')
  const renderComponentPath = join(installedPackageRoot, 'dist/runtime/render/render-component.js')
  const h3Resolution = await realpath(createRequire(pathToFileURL(previewHandlerPath)).resolve('h3'))
  const vueServerRendererResolution = await realpath(createRequire(pathToFileURL(renderComponentPath)).resolve('vue/server-renderer'))
  invariant(isInside(temporaryRoot, h3Resolution), `Packed h3 import escaped the isolated consumer: ${h3Resolution}`)
  invariant(isInside(temporaryRoot, vueServerRendererResolution), `Packed vue/server-renderer import escaped the isolated consumer: ${vueServerRendererResolution}`)
  const h3Module = await import(pathToFileURL(h3Resolution).href)
  const vueServerRendererModule = await import(pathToFileURL(vueServerRendererResolution).href)
  invariant(typeof h3Module.defineEventHandler === 'function', 'Installed h3 runtime does not export defineEventHandler')
  invariant(typeof vueServerRendererModule.renderToString === 'function', 'Vue peer does not provide vue/server-renderer')

  const prepare = await run('pnpm', ['exec', 'nuxt', 'prepare'], consumerDirectory)
  timingsMilliseconds.prepare = prepare.durationMilliseconds
  const serverTypes = await run('pnpm', [
    'exec',
    'vue-tsc',
    '--noEmit',
    '-p',
    '.nuxt/tsconfig.server.json',
  ], consumerDirectory)
  timingsMilliseconds.serverTypes = serverTypes.durationMilliseconds
  const configTypes = await run('pnpm', [
    'exec',
    'vue-tsc',
    '--noEmit',
    '-p',
    '.nuxt/tsconfig.node.json',
  ], consumerDirectory)
  timingsMilliseconds.configTypes = configTypes.durationMilliseconds
  const build = await run('pnpm', ['exec', 'nuxt', 'build'], consumerDirectory, { NODE_ENV: 'production' })
  timingsMilliseconds.build = build.durationMilliseconds

  const outputDirectory = join(consumerDirectory, '.output')
  const publicOutput = await readTextOutput(join(outputDirectory, 'public'))
  const serverOutput = await readTextOutput(join(outputDirectory, 'server'))
  const productionText = `${publicOutput.text}\n${serverOutput.text}`

  invariant(!publicOutput.text.includes('NUXT_EMAIL_FRESH_TEMPLATE_4D91'), 'Email template leaked into the production client bundle')
  invariant(serverOutput.text.includes('NUXT_EMAIL_FRESH_TEMPLATE_4D91'), 'Production server bundle omitted the discovered email template')
  invariant(!productionText.includes('NUXT_EMAIL_FRESH_FIXTURE_ONLY_8B27'), 'Development email fixture leaked into the production bundle')
  invariant(!productionText.includes('NUXT_EMAIL_PREVIEW_PAGE_V01'), 'Development preview page leaked into the production bundle')
  invariant(!productionText.includes('route: \'/__email\''), 'Development preview page route leaked into production')
  invariant(!productionText.includes('route: \'/__email/api/templates\''), 'Development template-list route leaked into production')
  invariant(!productionText.includes('route: \'/__email/render\''), 'Development preview-render route leaked into production')
  invariant(!serverOutput.paths.some(path => path.includes('/__email')), 'Production output emitted a preview route file')
  invariant(!serverOutput.paths.some(path => path.includes('.fixtures.')), 'Production output emitted a fixture module')

  const renderRoutes = (await collectFiles(join(outputDirectory, 'server')))
    .filter(path => path.replaceAll('\\', '/').endsWith('/chunks/routes/api/email.get.mjs'))
  invariant(renderRoutes.length === 1, `Expected one built email route, received ${renderRoutes.length}`)
  const routeUrl = pathToFileURL(renderRoutes[0]!).href
  const productionResultStart = 'NUXT_EMAIL_RELEASE_RENDER_RESULT_START'
  const productionResultEnd = 'NUXT_EMAIL_RELEASE_RENDER_RESULT_END'
  const productionRender = await run(process.execPath, [
    '--input-type=module',
    '--eval',
    `const route = await import(${JSON.stringify(routeUrl)}); const first = await route.default(); const second = await route.default(); const payload = ${JSON.stringify(productionResultStart)} + JSON.stringify({ first, second }) + ${JSON.stringify(productionResultEnd)}; process.stdout.write(payload, () => process.exit(0))`,
  ], consumerDirectory, { NODE_ENV: 'production' }, 30_000)
  timingsMilliseconds.productionRender = productionRender.durationMilliseconds
  const resultStart = productionRender.stdout.indexOf(productionResultStart)
  const resultEnd = productionRender.stdout.indexOf(
    productionResultEnd,
    resultStart + productionResultStart.length,
  )
  invariant(resultStart >= 0 && resultEnd > resultStart, 'Production route probe did not emit its result markers')
  const serializedResult = productionRender.stdout.slice(
    resultStart + productionResultStart.length,
    resultEnd,
  )
  const rendered = JSON.parse(serializedResult) as { first: RenderedEmail, second: RenderedEmail }

  invariant(JSON.stringify(rendered.first) === JSON.stringify(rendered.second), 'Two production renders were not byte-identical')
  invariant(rendered.first.html.startsWith('<!DOCTYPE html'), 'Production render did not return a complete HTML document')
  invariant(rendered.first.html.includes('NUXT_EMAIL_FRESH_TEMPLATE_4D91'), 'Production render omitted the email template sentinel')
  invariant(rendered.first.html.includes('Order 7319 for Ada &amp; Lin'), 'Production render did not escape and render typed props')
  invariant(rendered.first.text.includes('ORDER 7319 FOR ADA & LIN'), 'Production plain text did not preserve the rendered content')
  invariant(rendered.first.text.includes('View order https://example.com/orders/7319'), 'Production plain text did not preserve the email link')

  const freshInstallMilliseconds = performance.now() - freshInstallStartedAt
  invariant(
    freshInstallMilliseconds < maximumFreshInstallMilliseconds,
    `Fresh install ${runNumber} took ${(freshInstallMilliseconds / 1_000).toFixed(2)}s, exceeding the ten-minute release criterion`,
  )

  return {
    freshInstallMilliseconds,
    h3Resolution: relative(consumerDirectory, h3Resolution).replaceAll('\\', '/'),
    htmlBytes: Buffer.byteLength(rendered.first.html),
    packageResolution: relative(consumerDirectory, installedPackageRoot).replaceAll('\\', '/'),
    requiredNetworkFallback,
    run: runNumber,
    textBytes: Buffer.byteLength(rendered.first.text),
    timingsMilliseconds,
    vueServerRendererResolution: relative(consumerDirectory, vueServerRendererResolution).replaceAll('\\', '/'),
  }
}

async function verifyRelease(): Promise<void> {
  const artifactOutputPath = requestedArtifactPath(process.argv.slice(2))
  const sourceManifest = await readJson<PackageManifest>(join(packageRoot, 'package.json'))
  invariant(
    typeof sourceManifest.packageManager === 'string' && /^pnpm@\d+\.\d+\.\d+$/.test(sourceManifest.packageManager),
    'package.json must pin pnpm with packageManager before release verification',
  )
  const expectedPnpmVersion = sourceManifest.packageManager.slice('pnpm@'.length)
  const pnpmVersion = (await run('pnpm', ['--version'], packageRoot)).stdout.trim()
  invariant(pnpmVersion === expectedPnpmVersion, `Expected pnpm ${expectedPnpmVersion}, received ${pnpmVersion}`)

  const temporaryRoot = await realpath(await mkdtemp(join(tmpdir(), 'nuxt-email-release-verify-')))
  const artifactDirectory = join(temporaryRoot, 'artifacts')
  const tarballPath = join(artifactDirectory, 'nuxt-email.tgz')
  const inspectionDirectory = join(temporaryRoot, 'package-inspection')

  try {
    await mkdir(artifactDirectory)
    await mkdir(inspectionDirectory)

    const pack = await run('pnpm', ['pack', '--out', tarballPath], packageRoot)
    invariant((await stat(tarballPath)).isFile(), 'pnpm pack did not create the expected tarball')

    const archiveList = await run('tar', ['-tzf', tarballPath], temporaryRoot)
    const archiveEntries = archiveList.stdout.split(/\r?\n/).filter(Boolean)
    assertSafeArchiveEntries(archiveEntries)
    await run('tar', ['-xzf', tarballPath, '-C', inspectionDirectory], temporaryRoot)

    const inspectedPackageRoot = join(inspectionDirectory, 'package')
    const packedFiles = (await collectFiles(inspectedPackageRoot))
      .map(path => relative(inspectedPackageRoot, path).replaceAll('\\', '/'))
    const packedManifest = await readJson<PackageManifest>(join(inspectedPackageRoot, 'package.json'))
    assertPackedMetadata(sourceManifest, packedManifest)

    for (const requiredFile of [
      'LICENSE',
      'README.md',
      'THIRD_PARTY_NOTICES',
      'dist/module.mjs',
      'dist/types.d.mts',
      'dist/runtime/render/render-component.js',
      'dist/runtime/server/preview-page.get.js',
    ]) {
      invariant(packedFiles.includes(requiredFile), `Packed package is missing ${requiredFile}`)
    }
    const allowedPackageFile = /^(?:LICENSE|README\.md|THIRD_PARTY_NOTICES|package\.json|dist\/)/
    invariant(
      packedFiles.every(path => allowedPackageFile.test(path)),
      `Packed package contains files outside the release allowlist: ${packedFiles.filter(path => !allowedPackageFile.test(path)).join(', ')}`,
    )
    invariant(
      packedFiles.every(path => !/(?:^|\/)(?:node_modules|playground|scripts|src|test)(?:\/|$)/.test(path)),
      'Packed package contains workspace-only source, test, script, playground, or dependency files',
    )
    invariant(packedFiles.every(path => !path.includes('.fixtures.')), 'Packed package contains an email fixture module')

    const sourceThirdPartyNotices = await readFile(join(packageRoot, 'THIRD_PARTY_NOTICES'), 'utf8')
    const packedThirdPartyNotices = await readFile(join(inspectedPackageRoot, 'THIRD_PARTY_NOTICES'), 'utf8')
    invariant(
      sourceThirdPartyNotices.includes('Copyright 2024 Plus Five Five, Inc'),
      'THIRD_PARTY_NOTICES is missing the React Email 2024 Plus Five Five copyright notice',
    )
    invariant(
      packedThirdPartyNotices === sourceThirdPartyNotices,
      'Packed THIRD_PARTY_NOTICES must preserve the complete workspace notice byte-for-byte',
    )

    const modulesState = await readJson<PnpmModulesState>(join(packageRoot, 'node_modules/.modules.yaml'))
    invariant(
      typeof modulesState.storeDir === 'string' && modulesState.storeDir.length > 0,
      'The workspace install does not record a pnpm store directory in node_modules/.modules.yaml',
    )
    const workspaceStore = modulesState.storeDir
    const consumers: FreshConsumerResult[] = []
    for (const runNumber of [1, 2]) {
      consumers.push(await verifyFreshConsumer(
        runNumber,
        temporaryRoot,
        tarballPath,
        workspaceStore,
        packedManifest,
      ))
    }

    const tarballBytes = (await stat(tarballPath)).size
    const tarballSha256 = createHash('sha256').update(await readFile(tarballPath)).digest('hex')
    if (artifactOutputPath) {
      await mkdir(dirname(artifactOutputPath), { recursive: true })
      try {
        await copyFile(tarballPath, artifactOutputPath, COPYFILE_EXCL)
      }
      catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
          throw new Error(`Refusing to overwrite existing release artifact: ${artifactOutputPath}`, { cause: error })
        }
        throw error
      }
      const outputSha256 = createHash('sha256').update(await readFile(artifactOutputPath)).digest('hex')
      invariant(outputSha256 === tarballSha256, 'Copied release artifact does not match the verified tarball')
    }

    process.stdout.write(`\n${JSON.stringify({
      package: `${packedManifest.name}@${packedManifest.version}`,
      tarball: {
        bytes: tarballBytes,
        files: packedFiles.length,
        name: basename(tarballPath),
        output: artifactOutputPath ?? null,
        sha256: tarballSha256,
      },
      packSeconds: Number((pack.durationMilliseconds / 1_000).toFixed(3)),
      consumers: consumers.map(consumer => ({
        run: consumer.run,
        requiredNetworkFallback: consumer.requiredNetworkFallback,
        isolatedResolution: {
          h3: consumer.h3Resolution,
          package: consumer.packageResolution,
          vueServerRenderer: consumer.vueServerRendererResolution,
        },
        production: {
          htmlBytes: consumer.htmlBytes,
          previewAndFixturesExcluded: true,
          textBytes: consumer.textBytes,
          twoRendersByteIdentical: true,
        },
        timingsSeconds: Object.fromEntries(Object.entries({
          ...consumer.timingsMilliseconds,
          freshInstall: consumer.freshInstallMilliseconds,
        }).map(([name, milliseconds]) => [name, Number((milliseconds / 1_000).toFixed(3))])),
      })),
    }, null, 2)}\n`)
  }
  finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

await verifyRelease().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  process.stderr.write(`\nRelease verification failed:\n${message}\n`)
  process.exitCode = 1
})
