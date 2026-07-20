// The canonical normalizer lives in the shipped testing utilities so users and
// the conformance suite share one implementation. Re-exported here to preserve
// the existing `./normalize` import path used across the conformance tests.
export { normalizeEmailHtml } from '../../src/runtime/testing/normalize'
