export default {
  entries: [
    'src/build',
    {
      builder: 'copy',
      input: 'agent-docs',
      outDir: 'dist/agent',
    },
  ],
}
