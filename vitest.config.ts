import { defineConfig } from 'vitest/config'
import oracle from './test/conformance/oracle/react-email-6.9.0.json'

export default defineConfig({
  test: {
    tags: Object.keys(oracle.cases).map(caseId => ({
      description: `React Email conformance case ${caseId}`,
      name: `conformance:${caseId}`,
    })),
  },
})
