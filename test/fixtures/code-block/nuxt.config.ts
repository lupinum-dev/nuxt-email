import NuxtEmail from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    [NuxtEmail, {
      codeBlock: {
        languages: ['typescript'],
        theme: 'github-dark',
      },
    }],
  ],
})
