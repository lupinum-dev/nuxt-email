// `pnpm build` writes dist/agent/ (the packaged docs) after the module build, so the module
// builder cannot see the `./agent-docs` export yet. Drop exactly that warning; every other
// warning still fails the build.
const agentDocsOnly = /^Potential missing package\.json files: dist\/agent\/AGENTS\.md$/

export default {
  entries: [
    'src/build',
  ],
  hooks: {
    'build:done'(ctx: { warnings: Set<string> }) {
      for (const warning of ctx.warnings) {
        // eslint-disable-next-line no-control-regex -- strip terminal colors from the message
        if (agentDocsOnly.test(warning.replace(/\u001B\[[0-9;]*m/g, ''))) ctx.warnings.delete(warning)
      }
    },
  },
}
