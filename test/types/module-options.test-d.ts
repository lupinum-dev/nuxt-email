import type NuxtEmail from '../../src/module'

type NuxtEmailOptions = Parameters<typeof NuxtEmail>[0]

const noOptions: NuxtEmailOptions = {}
void noOptions

// @ts-expect-error @lupinum/nuxt-email has no module options
const arbitraryOptions: NuxtEmailOptions = { arbitrary: true }
void arbitraryOptions
