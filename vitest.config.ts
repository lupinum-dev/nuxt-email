import { configDefaults, defineConfig } from 'vitest/config'

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
    server: {
      deps: {
        // createTestRenderer writes its registry here; from source it imports the .ts renderer.
        inline: [/\/node_modules\/\.cache\/nuxt-email\//],
      },
    },
  },
})
