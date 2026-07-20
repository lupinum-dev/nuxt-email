import oracle from './oracle/react-email-6.9.0.json'
import { describe, expect, it } from 'vitest'
import { renderPlainText } from '../../src/runtime/render/plain-text'
import { plainTextCorpus } from './plain-text-corpus'

describe('plain-text conformance', () => {
  for (const [caseId, html] of Object.entries(plainTextCorpus)) {
    it(`matches the pinned React Email oracle for ${caseId}`, {
      tags: [`conformance:${caseId}`],
    }, () => {
      const oracleCase = oracle.cases[caseId as keyof typeof oracle.cases]

      expect('text' in oracleCase ? oracleCase.text : undefined).toBeTypeOf('string')
      expect(renderPlainText(html)).toBe('text' in oracleCase ? oracleCase.text : undefined)
    })
  }
})
