import type { CodeBlockOptions as ModuleCodeBlockOptions } from '../../src/module'
import type { CodeBlockOptions, RenderedEmail } from '../../src/testing'
import { createTestRenderer } from '../../src/testing'

// Untyped: any name, optional props.
const untyped = await createTestRenderer({ rootDir: '.', templatesDir: 'app/emails' })
const rendered: Promise<RenderedEmail> = untyped.renderEmail('welcome', { name: 'Ada' })
void rendered
void untyped.renderEmail('welcome')

// Typed with the generated EmailTemplateProps shape.
interface Templates {
  welcome: { name: string, plan?: string }
  digest: { limit?: number }
  plain: Record<string, never>
}
const typed = await createTestRenderer<Templates>({ rootDir: '.' })
void typed.renderEmail('welcome', { name: 'Ada' })
void typed.renderEmail('digest')
void typed.renderEmail('plain')
// @ts-expect-error welcome has a required prop
void typed.renderEmail('welcome')
// @ts-expect-error unknown template name
void typed.renderEmail('missing')
// @ts-expect-error props must match the template
void typed.renderEmail('welcome', { name: 1 })

const codeBlock: CodeBlockOptions = { languages: ['typescript'], theme: 'github-dark' }
const moduleCodeBlock: ModuleCodeBlockOptions = codeBlock
void createTestRenderer({ rootDir: '.', codeBlock: moduleCodeBlock })
// @ts-expect-error rootDir is required
void createTestRenderer({ templatesDir: 'app/emails' })
// @ts-expect-error codeBlock takes the module option shape
void createTestRenderer({ rootDir: '.', codeBlock: { languages: 'typescript' } })
