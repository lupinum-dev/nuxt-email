import { languageAliasNames, languageNames } from '@shikijs/langs'
import { themeNames } from '@shikijs/themes'

export interface CodeBlockOptions {
  languages: readonly string[]
  theme: string
}

export interface NormalizedCodeBlockOptions {
  languages: readonly string[]
  theme: string
}

const availableLanguages = new Set([...languageNames, ...languageAliasNames])
const availableThemes = new Set(themeNames)

function assertPlainObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
}

export function normalizeCodeBlockOptions(value: unknown): NormalizedCodeBlockOptions {
  assertPlainObject(value, 'nuxt-email codeBlock')

  const unknownOptions = Object.keys(value)
    .filter(name => name !== 'languages' && name !== 'theme')
    .sort()
  if (unknownOptions.length > 0) {
    throw new TypeError(`nuxt-email codeBlock received unknown option${unknownOptions.length === 1 ? '' : 's'}: ${unknownOptions.join(', ')}`)
  }

  if (!Array.isArray(value.languages) || value.languages.length === 0) {
    throw new TypeError('nuxt-email codeBlock.languages must be a non-empty array')
  }

  const languages = value.languages.map((language, index) => {
    if (typeof language !== 'string' || language.length === 0) {
      throw new TypeError(`nuxt-email codeBlock.languages[${index}] must be a non-empty string`)
    }
    if (!availableLanguages.has(language)) {
      throw new TypeError(`nuxt-email codeBlock language ${JSON.stringify(language)} is not available in Shiki`)
    }
    return language
  })
  const duplicateLanguage = languages.find((language, index) => languages.indexOf(language) !== index)
  if (duplicateLanguage !== undefined) {
    throw new TypeError(`nuxt-email codeBlock language ${JSON.stringify(duplicateLanguage)} is configured more than once`)
  }

  if (typeof value.theme !== 'string' || value.theme.length === 0) {
    throw new TypeError('nuxt-email codeBlock.theme must be a non-empty string')
  }
  if (!availableThemes.has(value.theme)) {
    throw new TypeError(`nuxt-email codeBlock theme ${JSON.stringify(value.theme)} is not available in Shiki`)
  }

  return Object.freeze({
    languages: Object.freeze(languages),
    theme: value.theme,
  })
}
