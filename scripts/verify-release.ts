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
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { arch, platform, release, tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

interface PackageManifest {
  name?: unknown
  version?: unknown
  description?: unknown
  author?: unknown
  license?: unknown
  type?: unknown
  main?: unknown
  private?: unknown
  types?: unknown
  packageManager?: unknown
  publishConfig?: Record<string, unknown>
  files?: unknown
  engines?: Record<string, unknown>
  bugs?: Record<string, unknown>
  homepage?: unknown
  repository?: Record<string, unknown>
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

interface PublicModuleProbe {
  checks: Record<string, boolean>
  resolved: Record<string, string>
}

interface RenderedEmail {
  html: string
  text: string
  subject?: string
}

interface FreshConsumerResult {
  freshInstallMilliseconds: number
  h3Resolution: string
  htmlBytes: number
  packageResolution: string
  requiredNetworkFallback: boolean
  run: number
  nuxtVersion: string
  textBytes: number
  timingsMilliseconds: Record<string, number>
  variant: ConsumerVariant
  vueServerRendererResolution: string
}

type ConsumerVariant = 'code-block' | 'default'

const executeFile = promisify(execFile)
const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const fixtureRoots = {
  'code-block': fileURLToPath(new URL('../test/fixtures/fresh-install', import.meta.url)),
  'default': fileURLToPath(new URL('../test/fixtures/fresh-install-default', import.meta.url)),
} satisfies Record<ConsumerVariant, string>
const maximumFreshInstallMilliseconds = 10 * 60 * 1_000
const textFilePattern = /\.(?:css|d\.ts|html|js|json|map|mjs|mts|txt)$/
const releaseContract = {
  name: '@lupinum/nuxt-email',
  node: '^22.18.0 || ^24.11.0 || ^26.0.0',
  nuxt: '>=4.5.1 <5',
  repository: 'git+https://github.com/lupinum-dev/nuxt-email.git',
  vue: '^3.5.35',
} as const

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
  invariant(source.name === releaseContract.name, `Source package name must be ${releaseContract.name}`)
  invariant(packed.name === source.name, 'Packed package name differs from package.json')
  invariant(
    packed.version === source.version
    && typeof packed.version === 'string'
    && /^\d+\.\d+\.\d+(?:-[\dA-Z.-]+)?$/i.test(packed.version),
    'Packed package version must be a publishable semantic version matching package.json',
  )
  invariant(packed.private !== true, 'Packed release package cannot be private')
  invariant(typeof packed.description === 'string' && packed.description.trim().length > 0, 'Packed package needs a description')
  invariant(packed.license === 'MIT', 'Packed package license must be MIT')
  invariant(
    packed.author === 'Lupinum OG <info@lupinum.com> (https://lupinum.com)',
    'Packed package author must identify Lupinum OG',
  )
  invariant(packed.type === 'module', 'Packed package must declare ESM with type="module"')
  invariant(packed.main === './dist/module.mjs', 'Packed package main entry must be ./dist/module.mjs')
  invariant(packed.types === './dist/module.d.mts', 'Packed package types entry must be ./dist/module.d.mts')
  invariant(
    Array.isArray(packed.files)
    && packed.files.length === 3
    && packed.files.includes('CHANGELOG.md')
    && packed.files.includes('dist')
    && packed.files.includes('THIRD_PARTY_NOTICES'),
    'Packed files allowlist differs from the release package surface',
  )
  invariant(packed.engines?.node === releaseContract.node, `Packed Node range must be ${releaseContract.node}`)
  invariant(packed.repository?.type === 'git', 'Packed package repository type must be git')
  invariant(packed.repository?.url === releaseContract.repository, 'Packed package repository URL differs from the release repository')
  invariant(packed.publishConfig?.access === 'public', 'Packed scoped package must publish with public access')
  invariant(packed.homepage === 'https://nuxt-email.lupinum.com', 'Packed package homepage differs from the release homepage')
  invariant(packed.bugs?.url === 'https://github.com/lupinum-dev/nuxt-email/issues', 'Packed package issue URL differs from the release issue tracker')

  invariant(
    JSON.stringify(Object.keys(packed.exports ?? {}).sort())
    === JSON.stringify(['.', './define-email', './errors', './testing']),
    'Packed package exports differ from the intentional public surface',
  )

  const rootExport = packed.exports?.['.']
  invariant(typeof rootExport === 'object' && rootExport !== null, 'Packed package must export its module root')
  invariant('import' in rootExport && rootExport.import === './dist/module.mjs', 'Packed import export must point to ./dist/module.mjs')
  invariant('types' in rootExport && rootExport.types === './dist/module.d.mts', 'Packed type export must point to ./dist/module.d.mts')

  const testingExport = packed.exports?.['./testing']
  invariant(typeof testingExport === 'object' && testingExport !== null, 'Packed package must export its ./testing subpath')
  invariant('import' in testingExport && testingExport.import === './dist/runtime/testing/index.js', 'Packed ./testing import export must point to ./dist/runtime/testing/index.js')
  invariant('types' in testingExport && testingExport.types === './dist/runtime/testing/index.d.ts', 'Packed ./testing type export must point to ./dist/runtime/testing/index.d.ts')

  for (const [subpath, importPath, typePath] of [
    ['./define-email', './dist/runtime/define-email.js', './dist/runtime/define-email.d.ts'],
    ['./errors', './dist/runtime/errors.js', './dist/runtime/errors.d.ts'],
  ] as const) {
    const packageExport = packed.exports?.[subpath]
    invariant(typeof packageExport === 'object' && packageExport !== null, `Packed package must export its ${subpath} subpath`)
    invariant('import' in packageExport && packageExport.import === importPath, `Packed ${subpath} import export must point to ${importPath}`)
    invariant('types' in packageExport && packageExport.types === typePath, `Packed ${subpath} type export must point to ${typePath}`)
  }

  invariant(typeof packed.dependencies?.h3 === 'string', 'Packed preview handlers import h3, so h3 must be a direct runtime dependency')
  invariant(packed.peerDependencies?.nuxt === releaseContract.nuxt, `Packed Nuxt peer range must be ${releaseContract.nuxt}`)
  invariant(packed.peerDependencies?.vue === releaseContract.vue, `Packed Vue peer range must be ${releaseContract.vue}`)

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
  variant: ConsumerVariant,
  temporaryRoot: string,
  tarballPath: string,
  workspaceStore: string,
  packedManifest: PackageManifest,
): Promise<FreshConsumerResult> {
  const freshInstallStartedAt = performance.now()
  const consumerDirectory = join(temporaryRoot, `fresh-consumer-${runNumber}-${variant}`)
  const timingsMilliseconds: Record<string, number> = {}
  const fixtureMaterializationStartedAt = performance.now()
  await cp(fixtureRoots[variant], consumerDirectory, { recursive: true })
  timingsMilliseconds.fixtureMaterialization = performance.now() - fixtureMaterializationStartedAt

  const consumerManifestPath = join(consumerDirectory, 'package.json')
  const consumerManifest = await readJson<PackageManifest & { dependencies: Record<string, string> }>(consumerManifestPath)
  invariant(consumerManifest.dependencies['@lupinum/nuxt-email'] === 'file:__NUXT_EMAIL_TARBALL__', 'Fresh-install fixture lost its tarball placeholder')
  consumerManifest.dependencies['@lupinum/nuxt-email'] = `file:${relative(consumerDirectory, tarballPath).replaceAll('\\', '/')}`
  await writeFile(consumerManifestPath, `${JSON.stringify(consumerManifest, null, 2)}\n`, 'utf8')

  process.stdout.write(`\n=== Fresh consumer: ${variant} ===\n`)
  const installStartedAt = performance.now()
  const installArguments = [
    'install',
    '--no-frozen-lockfile',
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
    const offlineDataIsIncomplete = [
      'ERR_PNPM_NO_MATCHING_VERSION',
      'ERR_PNPM_NO_OFFLINE_META',
      'ERR_PNPM_NO_OFFLINE_TARBALL',
    ].some(code => message.includes(code))
    if (!offlineDataIsIncomplete) {
      throw error
    }

    requiredNetworkFallback = true
    const missingTarball = message.match(/missing package may be downloaded from (https?:\/\/\S+)/i)?.[1]?.replace(/\.$/, '')
    process.stdout.write(
      `  local pnpm store or metadata is incomplete${missingTarball ? `; missing ${missingTarball}` : ''}; retrying with prefer-offline\n`,
    )
    await rm(join(consumerDirectory, 'node_modules'), { recursive: true, force: true })
    await rm(join(consumerDirectory, 'pnpm-lock.yaml'), { force: true })
    await run('pnpm', [...installArguments, '--prefer-offline'], consumerDirectory)
  }
  timingsMilliseconds.install = performance.now() - installStartedAt

  const installedPackageRoot = await realpath(join(consumerDirectory, 'node_modules/@lupinum/nuxt-email'))
  invariant(isInside(temporaryRoot, installedPackageRoot), `Fresh install resolved @lupinum/nuxt-email outside its temporary app: ${installedPackageRoot}`)
  invariant(!isInside(packageRoot, installedPackageRoot), 'Fresh install resolved @lupinum/nuxt-email from the source checkout')
  invariant(!(await collectFiles(installedPackageRoot)).some(path => relative(installedPackageRoot, path).startsWith('src/')), 'Installed package contains source files')

  const installedManifest = await readJson<PackageManifest>(join(installedPackageRoot, 'package.json'))
  invariant(installedManifest.name === releaseContract.name, 'Installed package name differs from the release contract')
  invariant(installedManifest.version === packedManifest.version, 'Installed package version differs from the packed tarball')

  const publicProbeMarker = 'NUXT_EMAIL_PUBLIC_MODULE_PROBE:'
  const publicProbe = await run(process.execPath, [
    '--input-type=module',
    '--eval',
    `const specifiers = ${JSON.stringify([
      '@lupinum/nuxt-email/define-email',
      '@lupinum/nuxt-email/errors',
      '@lupinum/nuxt-email/testing',
    ])};`
    + ` const resolved = Object.fromEntries(specifiers.map(specifier => [specifier, import.meta.resolve(specifier)]));`
    + ` const [defineEmail, errors, testing] = await Promise.all(specifiers.map(specifier => import(specifier)));`
    + ` const renderError = new errors.EmailRenderError('welcome', new Error('cause'));`
    + ` const checks = {`
    + ` defineEmail: typeof defineEmail.defineEmail === 'function',`
    + ` defineEmailOutside: typeof defineEmail.DefineEmailOutsideRenderError === 'function',`
    + ` duplicateDefinition: typeof defineEmail.DuplicateEmailDefinitionError === 'function',`
    + ` defineEmailSurface: JSON.stringify(Object.keys(defineEmail).sort()) === JSON.stringify(['DefineEmailOutsideRenderError', 'DuplicateEmailDefinitionError', 'defineEmail']),`
    + ` noCreateRenderContext: !('createEmailRenderContext' in defineEmail),`
    + ` noGetRenderContext: !('getEmailRenderContext' in defineEmail),`
    + ` noRunRenderContext: !('runWithEmailRenderContext' in defineEmail),`
    + ` errorsDefineEmailOutside: typeof errors.DefineEmailOutsideRenderError === 'function',`
    + ` errorsDuplicateDefinition: typeof errors.DuplicateEmailDefinitionError === 'function',`
    + ` emailRenderError: typeof errors.EmailRenderError === 'function',`
    + ` emailRenderErrorContract: renderError.templateName === 'welcome' && !('componentName' in renderError) && renderError.cause?.message === 'cause',`
    + ` tailwindMissingHeadError: typeof errors.TailwindMissingHeadError === 'function',`
    + ` unknownTemplateError: typeof errors.UnknownEmailTemplateError === 'function',`
    + ` errorsSurface: JSON.stringify(Object.keys(errors).sort()) === JSON.stringify(['DefineEmailOutsideRenderError', 'DuplicateEmailDefinitionError', 'EmailRenderError', 'TailwindMissingHeadError', 'UnknownEmailTemplateError']),`
    + ` defineEmailErrorIdentity: defineEmail.DefineEmailOutsideRenderError === errors.DefineEmailOutsideRenderError && defineEmail.DuplicateEmailDefinitionError === errors.DuplicateEmailDefinitionError,`
    + ` renderEmailComponent: typeof testing.renderEmailComponent === 'function',`
    + ` testingSurface: JSON.stringify(Object.keys(testing).sort()) === JSON.stringify(['EmailRenderError', 'renderEmailComponent']),`
    + ` testingErrorIdentity: testing.EmailRenderError === errors.EmailRenderError } ;`
    + ` process.stdout.write(${JSON.stringify(publicProbeMarker)} + JSON.stringify({ checks, resolved }));`,
  ], consumerDirectory)
  const publicProbeStart = publicProbe.stdout.indexOf(publicProbeMarker)
  invariant(publicProbeStart >= 0, 'Packed public-subpath probe did not emit its result marker')
  const publicModules = JSON.parse(
    publicProbe.stdout.slice(publicProbeStart + publicProbeMarker.length),
  ) as PublicModuleProbe
  for (const [check, passed] of Object.entries(publicModules.checks)) {
    invariant(passed, `Packed public-subpath probe failed: ${check}`)
  }
  for (const [specifier, resolvedUrl] of Object.entries(publicModules.resolved)) {
    invariant(resolvedUrl.startsWith('file:'), `Packed ${specifier} resolved to a non-file URL: ${resolvedUrl}`)
    const resolvedPath = fileURLToPath(resolvedUrl)
    invariant(isInside(installedPackageRoot, resolvedPath), `Packed ${specifier} resolved outside the installed package: ${resolvedPath}`)
  }

  const consumerRequire = createRequire(join(consumerDirectory, 'package.json'))
  const previewHandlerPath = join(installedPackageRoot, 'dist/runtime/dev-preview/page.get.js')
  const renderComponentPath = join(installedPackageRoot, 'dist/runtime/render/render-component.js')
  const h3Resolution = await realpath(createRequire(pathToFileURL(previewHandlerPath)).resolve('h3'))
  const vueServerRendererResolution = await realpath(createRequire(pathToFileURL(renderComponentPath)).resolve('vue/server-renderer'))
  invariant(isInside(temporaryRoot, h3Resolution), `Packed h3 import escaped the isolated consumer: ${h3Resolution}`)
  invariant(isInside(temporaryRoot, vueServerRendererResolution), `Packed vue/server-renderer import escaped the isolated consumer: ${vueServerRendererResolution}`)
  const h3Module = await import(pathToFileURL(h3Resolution).href)
  const vueServerRendererModule = await import(pathToFileURL(vueServerRendererResolution).href)
  const previewPageModule = await import(pathToFileURL(previewHandlerPath).href)
  invariant(typeof h3Module.defineEventHandler === 'function', 'Installed h3 runtime does not export defineEventHandler')
  invariant(typeof vueServerRendererModule.renderToString === 'function', 'Vue peer does not provide vue/server-renderer')
  invariant(typeof previewPageModule.default === 'function', 'Packed development preview page is not importable')
  invariant(
    typeof previewPageModule.PREVIEW_PAGE_HTML === 'string'
    && previewPageModule.PREVIEW_PAGE_HTML.includes('NUXT_EMAIL_PREVIEW_PAGE_V01'),
    'Packed development preview page omitted its CSS, script, or stable page marker',
  )

  const prepare = await run('pnpm', ['exec', 'nuxt', 'prepare'], consumerDirectory)
  timingsMilliseconds.prepare = prepare.durationMilliseconds
  if (variant === 'code-block') {
    const standaloneTests = await run('pnpm', [
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.standalone.config.ts',
    ], consumerDirectory)
    timingsMilliseconds.standaloneTests = standaloneTests.durationMilliseconds
    const configuredTests = await run('pnpm', [
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.configured.config.ts',
    ], consumerDirectory)
    timingsMilliseconds.configuredTests = configuredTests.durationMilliseconds
  }
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

  const installedNuxtManifest = await readJson<{ version?: unknown }>(
    consumerRequire.resolve('nuxt/package.json'),
  )
  invariant(
    typeof installedNuxtManifest.version === 'string'
    && installedNuxtManifest.version === consumerManifest.dependencies.nuxt,
    `Fresh consumer ${runNumber} installed Nuxt ${String(installedNuxtManifest.version)} instead of ${consumerManifest.dependencies.nuxt}`,
  )

  const outputDirectory = join(consumerDirectory, '.output')
  const publicOutput = await readTextOutput(join(outputDirectory, 'public'))
  const serverOutput = await readTextOutput(join(outputDirectory, 'server'))
  const productionText = `${publicOutput.text}\n${serverOutput.text}`

  const templateSentinel = variant === 'code-block'
    ? 'NUXT_EMAIL_FRESH_TEMPLATE_4D91'
    : 'NUXT_EMAIL_DEFAULT_TEMPLATE_7C62'
  invariant(!publicOutput.text.includes(templateSentinel), 'Email template leaked into the production client bundle')
  invariant(serverOutput.text.includes(templateSentinel), 'Production server bundle omitted the discovered email template')
  if (variant === 'code-block') {
    invariant(serverOutput.text.includes('source.ts'), 'Production server bundle omitted the configured TypeScript grammar')
    invariant(!serverOutput.text.includes('source.python'), 'Production server bundle included an unconfigured Python grammar')
    invariant(!serverOutput.text.includes('bundle/web'), 'Production server bundle included Shiki full or web registries')
  }
  else {
    invariant(!serverOutput.text.includes('source.ts'), 'Default production bundle included the opt-in TypeScript grammar')
    invariant(!serverOutput.text.includes('@shikijs'), 'Default production bundle included opt-in Shiki modules')
  }
  invariant(!productionText.includes('NUXT_EMAIL_FRESH_FIXTURE_ONLY_8B27'), 'Development email fixture leaked into the production bundle')
  invariant(!productionText.includes('NUXT_EMAIL_PREVIEW_PAGE_V01'), 'Development preview page leaked into the production bundle')
  invariant(!productionText.includes('route: \'/__email\''), 'Development preview page route leaked into production')
  invariant(!productionText.includes('route: \'/__email/api/templates\''), 'Development template-list route leaked into production')
  invariant(!productionText.includes('route: \'/__email/render\''), 'Development preview-render route leaked into production')
  invariant(!serverOutput.paths.some(path => path.includes('/__email')), 'Production output emitted a preview route file')
  invariant(!serverOutput.paths.some(path => path.includes('.fixtures.')), 'Production output emitted a fixture module')

  const deployedOutputDirectory = join(temporaryRoot, `deployed-output-${runNumber}`)
  await cp(outputDirectory, deployedOutputDirectory, { recursive: true })
  const renderRoutes = (await collectFiles(join(deployedOutputDirectory, 'server')))
    .filter(path => path.replaceAll('\\', '/').endsWith('/chunks/routes/api/email.get.mjs'))
  invariant(renderRoutes.length === 1, `Expected one built email route, received ${renderRoutes.length}`)
  const routeUrl = pathToFileURL(renderRoutes[0]!).href
  const productionResultStart = 'NUXT_EMAIL_RELEASE_RENDER_RESULT_START'
  const productionResultEnd = 'NUXT_EMAIL_RELEASE_RENDER_RESULT_END'
  // Nitro emits the route handler as a bare `export default` for a light module
  // graph, but re-exports it through a frozen Module namespace (its lazy loader
  // takes `import(route).then(n => n.e)`) once a shared module — e.g.
  // `defineEmail`'s render-context module used by the template — is hoisted into
  // this chunk. Resolve the handler for both shapes exactly as Nitro does before
  // rendering, so this probe exercises the real production handler.
  const resolveHandler
    = `(route) => { const ns = typeof route.default === 'function' ? route`
      + ` : Object.values(route).find((value) => value && typeof value === 'object' && typeof value.default === 'function');`
      + ` const handler = ns && ns.default;`
      + ` if (typeof handler !== 'function') { process.stderr.write('Built email route exposed no callable handler; exports: ' + Object.keys(route).join(', ')); process.exit(3); }`
      + ` return handler; }`
  const consumerNodeModules = join(consumerDirectory, 'node_modules')
  const hiddenConsumerNodeModules = join(consumerDirectory, '.node_modules-release-verifier-hidden')
  await rename(consumerNodeModules, hiddenConsumerNodeModules)
  let productionRender: CommandResult
  try {
    productionRender = await run(process.execPath, [
      '--input-type=module',
      '--eval',
      `try { const route = await import(${JSON.stringify(routeUrl)}); const handler = (${resolveHandler})(route); const first = await handler(); const second = await handler(); const payload = ${JSON.stringify(productionResultStart)} + JSON.stringify({ first, second }) + ${JSON.stringify(productionResultEnd)}; process.stdout.write(payload, () => process.exit(0)); } catch (error) { console.error(error); if (error && typeof error === 'object' && 'cause' in error) console.error('Caused by:', error.cause); process.exit(2); }`,
    ], deployedOutputDirectory, { NODE_ENV: 'production' }, 30_000)
  }
  finally {
    await rename(hiddenConsumerNodeModules, consumerNodeModules)
  }
  timingsMilliseconds.productionRender = productionRender.durationMilliseconds
  const resultStart = productionRender.stdout.indexOf(productionResultStart)
  const resultEnd = productionRender.stdout.indexOf(
    productionResultEnd,
    resultStart + productionResultStart.length,
  )
  const probeOutputTail = (label: string, output: string): string => {
    const trimmed = output.trim()
    return trimmed.length === 0 ? `` : `\n  ${label} tail:\n${trimmed.split(/\r?\n/).slice(-20).map(line => `    ${line}`).join('\n')}`
  }
  invariant(
    resultStart >= 0 && resultEnd > resultStart,
    'Production route probe did not emit its result markers.'
    + ' The bundled chunk likely threw before rendering (e.g. a runtime-dynamic'
    + ` require that cannot resolve from the virtual bundle entry).${probeOutputTail('stderr', productionRender.stderr)}${probeOutputTail('stdout', productionRender.stdout)}`,
  )
  const serializedResult = productionRender.stdout.slice(
    resultStart + productionResultStart.length,
    resultEnd,
  )
  const rendered = JSON.parse(serializedResult) as { first: RenderedEmail, second: RenderedEmail }

  invariant(JSON.stringify(rendered.first) === JSON.stringify(rendered.second), 'Two production renders were not byte-identical')
  invariant(rendered.first.html.startsWith('<!DOCTYPE html'), 'Production render did not return a complete HTML document')
  invariant(rendered.first.html.includes(templateSentinel), 'Production render omitted the email template sentinel')
  invariant(rendered.first.html.includes('Order 7319 for Ada &amp; Lin'), 'Production render did not escape and render typed props')
  invariant(rendered.first.text.includes('ORDER 7319 FOR ADA & LIN'), 'Production plain text did not preserve the rendered content')
  if (variant === 'code-block') {
    invariant(rendered.first.html.includes('data-code-theme="github-dark"'), 'Production render omitted the configured code-block theme')
    invariant(rendered.first.html.includes('color:#F97583'), 'Production render omitted TypeScript syntax token colors')
    invariant(rendered.first.html.includes('&lt;ready&gt;'), 'Production code block did not escape source markup')
    invariant(!rendered.first.html.includes('<ready>'), 'Production code block emitted unescaped source markup')
    invariant(rendered.first.html.includes('padding:16px'), 'Production code block omitted its email-safe padding')
    invariant(rendered.first.text.includes('const status: string = "<ready>"'), 'Production plain text omitted the code block')
    invariant(!rendered.first.text.includes('1const status'), 'Production plain text leaked decorative code line numbers')
  }
  else {
    invariant(!rendered.first.html.includes('data-code-theme='), 'Default production render included the opt-in code component')
  }
  invariant(rendered.first.text.includes('View order https://example.com/orders/7319'), 'Production plain text did not preserve the email link')
  invariant(rendered.first.subject === 'Order 7319 confirmed', 'Production render did not preserve the computed subject')

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
    nuxtVersion: installedNuxtManifest.version,
    textBytes: Buffer.byteLength(rendered.first.text),
    timingsMilliseconds,
    variant,
    vueServerRendererResolution: relative(consumerDirectory, vueServerRendererResolution).replaceAll('\\', '/'),
  }
}

async function verifyRelease(): Promise<void> {
  const artifactOutputPath = requestedArtifactPath(process.argv.slice(2))
  const sourceCommit = (await run('git', ['rev-parse', 'HEAD'], packageRoot)).stdout.trim()
  invariant(/^[0-9a-f]{40}$/.test(sourceCommit), 'Release verification could not resolve a full source commit')
  if (artifactOutputPath) {
    const worktreeStatus = (await run('git', [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ], packageRoot)).stdout.trim()
    invariant(worktreeStatus.length === 0, 'Refusing to create a release artifact from a dirty worktree')
  }

  const sourceManifest = await readJson<PackageManifest>(join(packageRoot, 'package.json'))
  const freshFixtureManifests = await Promise.all(
    Object.values(fixtureRoots).map(root => readJson<{ dependencies?: Record<string, string> }>(join(root, 'package.json'))),
  )
  for (const freshFixtureManifest of freshFixtureManifests) {
    invariant(freshFixtureManifest.dependencies?.nuxt === '4.5.2', 'Fresh-install fixture must pin Nuxt 4.5.2')
    invariant(
      freshFixtureManifest.dependencies?.['@lupinum/nuxt-email'] === 'file:__NUXT_EMAIL_TARBALL__',
      'Fresh-install fixture must consume the scoped release tarball placeholder',
    )
    invariant(freshFixtureManifest.dependencies?.vue === '3.5.40', 'Fresh-install fixture must pin Vue 3.5.40')
  }
  invariant(
    typeof sourceManifest.packageManager === 'string' && /^pnpm@\d+\.\d+\.\d+$/.test(sourceManifest.packageManager),
    'package.json must pin pnpm with packageManager before release verification',
  )
  const expectedPnpmVersion = sourceManifest.packageManager.slice('pnpm@'.length)
  const pnpmVersion = (await run('pnpm', ['--version'], packageRoot)).stdout.trim()
  invariant(pnpmVersion === expectedPnpmVersion, `Expected pnpm ${expectedPnpmVersion}, received ${pnpmVersion}`)

  const temporaryRoot = await realpath(await mkdtemp(join(tmpdir(), 'nuxt-email-release-verify-')))
  const artifactDirectory = join(temporaryRoot, 'artifacts')
  const tarballPath = join(artifactDirectory, 'lupinum-nuxt-email.tgz')
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
      'CHANGELOG.md',
      'THIRD_PARTY_NOTICES',
      'dist/module.mjs',
      'dist/module.d.mts',
      'dist/types.d.mts',
      'dist/runtime/render/render-component.js',
      'dist/runtime/define-email.js',
      'dist/runtime/define-email.d.ts',
      'dist/runtime/errors.js',
      'dist/runtime/errors.d.ts',
      'dist/runtime/testing/index.js',
      'dist/runtime/testing/index.d.ts',
      'dist/runtime/dev-preview/page-script.js',
      'dist/runtime/dev-preview/page.css.js',
      'dist/runtime/dev-preview/page.get.js',
      'dist/runtime/dev-preview/render.get.js',
      'dist/runtime/dev-preview/templates.get.js',
    ]) {
      invariant(packedFiles.includes(requiredFile), `Packed package is missing ${requiredFile}`)
    }
    const allowedTopLevelFiles = new Set([
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
      'THIRD_PARTY_NOTICES',
      'package.json',
    ])
    const allowedPackageFile = (path: string) => (
      allowedTopLevelFiles.has(path)
      || path.startsWith('dist/')
    )
    invariant(
      packedFiles.every(allowedPackageFile),
      `Packed package contains files outside the release allowlist: ${packedFiles.filter(path => !allowedPackageFile(path)).join(', ')}`,
    )
    invariant(
      packedFiles.every(path => !path.startsWith('docs/')),
      'Packed package contains repository-only documentation instead of linking to the canonical documentation site',
    )
    invariant(
      packedFiles.every(path => !/(?:^|\/)(?:node_modules|playground|scripts|src|test)(?:\/|$)/.test(path)),
      'Packed package contains workspace-only source, test, script, playground, or dependency files',
    )
    invariant(packedFiles.every(path => !path.includes('.fixtures.')), 'Packed package contains an email fixture module')

    const packedReadme = await readFile(join(inspectedPackageRoot, 'README.md'), 'utf8')
    for (const requiredText of ['wordmark-light.svg', '@lupinum/nuxt-email', 'renderEmail']) {
      invariant(packedReadme.includes(requiredText), `Packed README is missing required text: ${requiredText}`)
    }
    for (const scaffoldText of [
      'Get your module up and running quickly.',
      'My new Nuxt module for doing amazing things.',
      'npx nuxt module add my-module',
      'your-org/my-module',
      'Nuxt module playground',
    ]) {
      invariant(!packedReadme.includes(scaffoldText), `Packed README contains scaffold text: ${scaffoldText}`)
    }
    const localReadmeLinks = [...packedReadme.matchAll(/\]\((?![#a-z]+:)([^)]+)\)/gi)]
      .map(match => match[1]!.split('#', 1)[0]!.replace(/^\.\//, ''))
      .filter(Boolean)
    for (const linkedPath of localReadmeLinks) {
      invariant(packedFiles.includes(linkedPath), `Packed README links to a missing local file: ${linkedPath}`)
    }

    const sourceLicense = await readFile(join(packageRoot, 'LICENSE'), 'utf8')
    const packedLicense = await readFile(join(inspectedPackageRoot, 'LICENSE'), 'utf8')
    invariant(packedLicense === sourceLicense, 'Packed LICENSE must preserve the workspace license byte-for-byte')

    const sourceThirdPartyNotices = await readFile(join(packageRoot, 'THIRD_PARTY_NOTICES'), 'utf8')
    const packedThirdPartyNotices = await readFile(join(inspectedPackageRoot, 'THIRD_PARTY_NOTICES'), 'utf8')
    for (const noticeText of [
      'Copyright 2024 Plus Five Five, Inc',
      'Permission is hereby granted, free of charge',
      'THE SOFTWARE IS PROVIDED "AS IS"',
    ]) {
      invariant(sourceThirdPartyNotices.includes(noticeText), `THIRD_PARTY_NOTICES is missing: ${noticeText}`)
    }
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
    consumers.push(await verifyFreshConsumer(
      1,
      'default',
      temporaryRoot,
      tarballPath,
      workspaceStore,
      packedManifest,
    ))
    consumers.push(await verifyFreshConsumer(
      2,
      'code-block',
      temporaryRoot,
      tarballPath,
      workspaceStore,
      packedManifest,
    ))

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
      source: {
        commit: sourceCommit,
        node: process.version,
        operatingSystem: `${platform()} ${release()}`,
        architecture: arch(),
        pnpm: pnpmVersion,
        nuxt: freshFixtureManifests[0]!.dependencies!.nuxt,
        vue: freshFixtureManifests[0]!.dependencies!.vue,
      },
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
        variant: consumer.variant,
        nuxt: consumer.nuxtVersion,
        requiredNetworkFallback: consumer.requiredNetworkFallback,
        isolatedResolution: {
          h3: consumer.h3Resolution,
          package: consumer.packageResolution,
          vueServerRenderer: consumer.vueServerRendererResolution,
        },
        production: {
          htmlBytes: consumer.htmlBytes,
          previewAndFixturesExcluded: true,
          publicErrorIdentityPreserved: true,
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
