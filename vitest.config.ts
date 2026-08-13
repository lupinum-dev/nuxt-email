import { configDefaults, defineConfig } from 'vitest/config'
import oracle from './test/conformance/oracle/react-email-6.9.0.json' with { type: 'json' }

export default defineConfig({
  test: {
    // Nuxt integration fixtures start watcher-heavy application servers. Running
    // two fixtures concurrently can exhaust macOS file handles and random ports.
    exclude: [
      ...configDefaults.exclude,
      'test/fixtures/fresh-install/**',
      'test/fixtures/fresh-install-default/**',
    ],
    fileParallelism: false,
    tags: Object.keys(oracle.cases).map(caseId => ({
      description: `React Email conformance case ${caseId}`,
      name: `conformance:${caseId}`,
    })),
  },
})
