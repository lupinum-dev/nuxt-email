import NuxtEmail from '../../../src/module'

// ECodeBlock without the codeBlock option must fail the build.
export default defineNuxtConfig({
  modules: [NuxtEmail],
})
