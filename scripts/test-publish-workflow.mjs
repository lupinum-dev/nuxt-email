await import('./test-release-workflow.mjs')
await import('./test-npm-recovery.mjs')
await import('./test-release-recovery.mjs')

process.stdout.write('Publish workflow policy verified.\n')
