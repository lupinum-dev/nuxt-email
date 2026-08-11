import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const generatedTsconfigPath = fileURLToPath(new URL('./.nuxt/tsconfig.json', import.meta.url))
const generatedTsconfig = JSON.parse(readFileSync(generatedTsconfigPath, 'utf8')) as {
  compilerOptions?: { paths?: Record<string, string[]> }
}
const configuredRendererPath = generatedTsconfig.compilerOptions?.paths?.['#nuxt-email/testing']?.[0]
if (!configuredRendererPath) {
  throw new Error('Run `nuxt prepare` before configured email tests')
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '#nuxt-email/testing': resolve(dirname(generatedTsconfigPath), configuredRendererPath),
    },
  },
  test: {
    environment: 'node',
    include: ['test/nuxt/configured.test.ts'],
  },
})
