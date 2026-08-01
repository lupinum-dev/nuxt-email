import type NuxtEmail from '../../src/module'

type NuxtEmailOptions = Parameters<typeof NuxtEmail>[0]

const noOptions: NuxtEmailOptions = {}
void noOptions

const codeBlockOptions: NuxtEmailOptions = {
  codeBlock: {
    languages: ['typescript', 'vue'],
    theme: 'github-dark',
  },
}
void codeBlockOptions

// @ts-expect-error unsupported module options are rejected
const arbitraryOptions: NuxtEmailOptions = { arbitrary: true }
void arbitraryOptions
