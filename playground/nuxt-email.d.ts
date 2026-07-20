// `defineEmail` is provided to email templates as a server-side auto-import
// (registered via `addServerImports` in the module). The playground type-checks
// `app/emails/**` with the app tsconfig, which does not include that server import,
// so this ambient declaration mirrors the runtime signature for the demo template.
// It is playground-only; see docs/preview.md for the `defineEmail` contract.
declare global {
  function defineEmail<TProps = Record<string, unknown>>(options: {
    subject: (props: TProps) => string
  }): void
}

export {}
