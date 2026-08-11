import type { NormalizedCodeBlockOptions } from './options'

export interface CodeBlockRuntimePaths {
  core: string
  createCodeBlockComponent: string
  engineJavaScript: string
  languages: readonly string[]
  theme: string
}

function importPath(path: string): string {
  return JSON.stringify(path.replaceAll('\\', '/'))
}

function quotedList(values: readonly string[]): string {
  return values.map(value => JSON.stringify(value)).join(', ')
}

export function generateCodeBlockComponent(
  options: NormalizedCodeBlockOptions,
  paths: CodeBlockRuntimePaths,
): string {
  if (paths.languages.length !== options.languages.length) {
    throw new TypeError('nuxt-email internal error: each configured code-block language needs one resolved module')
  }

  const languageImports = paths.languages
    .map((path, index) => `import language${index} from ${importPath(path)}`)
    .join('\n')
  const languageValues = paths.languages.map((_path, index) => `language${index}`).join(', ')

  return `import { createHighlighterCore } from ${importPath(paths.core)}
import { createJavaScriptRegexEngine } from ${importPath(paths.engineJavaScript)}
${languageImports}
import codeBlockTheme from ${importPath(paths.theme)}
import { createCodeBlockComponent } from ${importPath(paths.createCodeBlockComponent)}

const enabledLanguages = Object.freeze([${quotedList(options.languages)}])
let highlighterPromise

function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    langs: [${languageValues}],
    themes: [codeBlockTheme],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighterPromise
}

export const ECodeBlock = createCodeBlockComponent({
  enabledLanguages,
  theme: ${JSON.stringify(options.theme)},
  async highlight(code, language) {
    const highlighter = await getHighlighter()
    return highlighter.codeToTokens(code, {
      lang: language,
      theme: ${JSON.stringify(options.theme)},
    })
  },
})
`
}
