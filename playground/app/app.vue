<template>
  <main>
    <header>
      <p class="product-name">
        nuxt-email <span>playground</span>
      </p>
      <h1>Write once. Inspect the exact server output.</h1>
      <p class="lede">
        The development preview, HTML source, plain text, and Nitro API all use
        the same generated registry and renderer.
      </p>
      <div class="actions">
        <a
          class="primary-action"
          href="/__email"
        >
          Open email preview
        </a>
        <a
          class="secondary-action"
          href="/api/email"
          rel="noreferrer"
          target="_blank"
        >
          Inspect API output
        </a>
      </div>
    </header>

    <section aria-labelledby="workflow-title">
      <div class="section-intro">
        <h2 id="workflow-title">
          One path, three files.
        </h2>
        <p>
          Author with ordinary Vue. Nuxt discovers the template and generates
          the typed server API automatically.
        </p>
      </div>

      <ol>
        <li>
          <code>app/emails/welcome.vue</code>
          <span>A typed Vue SFC built from supported email components.</span>
        </li>
        <li>
          <code>app/emails/welcome.fixtures.ts</code>
          <span>One exact-typed, deterministic development fixture.</span>
        </li>
        <li>
          <code>server/api/email.get.ts</code>
          <span>A server route calling <code>renderEmail('welcome', props)</code>.</span>
        </li>
      </ol>
    </section>

    <p class="production-note">
      <strong>Production boundary:</strong> preview routes and fixtures are removed
      from production builds. The renderer and templates remain server-only.
    </p>
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: oklch(0.21 0.012 160);
  background: oklch(0.975 0.004 160);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

main {
  width: min(100% - 2rem, 68rem);
  margin: 0 auto;
  padding: 6rem 0 4rem;
}

header {
  max-width: 46rem;
}

.product-name {
  margin: 0 0 2rem;
  color: oklch(0.4 0.087 160);
  font-size: 0.9375rem;
  font-weight: 750;
}

.product-name span {
  margin-left: 0.45rem;
  color: oklch(0.46 0.014 160);
  font-weight: 500;
}

h1,
h2,
p {
  text-wrap: pretty;
}

h1 {
  max-width: 13ch;
  margin: 0;
  font-size: 4rem;
  line-height: 0.98;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.lede {
  max-width: 62ch;
  margin: 1.75rem 0 0;
  color: oklch(0.4 0.018 160);
  font-size: 1.125rem;
  line-height: 1.65;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}

.actions a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  color: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.primary-action {
  background: oklch(0.4 0.087 160);
  color: white !important;
}

.primary-action:hover {
  background: oklch(0.34 0.087 160);
}

.secondary-action {
  border: 1px solid oklch(0.81 0.012 160);
  background: oklch(1 0 0);
}

.secondary-action:hover {
  border-color: oklch(0.55 0.03 160);
  background: oklch(0.96 0.008 160);
}

.actions a:focus-visible {
  outline: 3px solid oklch(0.66 0.13 160);
  outline-offset: 3px;
}

section {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(20rem, 1.2fr);
  gap: 4rem;
  margin-top: 6rem;
  padding-top: 2.5rem;
  border-top: 1px solid oklch(0.84 0.01 160);
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: -0.025em;
}

.section-intro p {
  max-width: 42ch;
  margin: 0.8rem 0 0;
  color: oklch(0.43 0.016 160);
  line-height: 1.6;
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  gap: 0.45rem;
  padding: 1rem 0;
  border-bottom: 1px solid oklch(0.87 0.008 160);
}

li:first-child {
  padding-top: 0;
}

li code {
  overflow-wrap: anywhere;
  color: oklch(0.28 0.025 160);
  font-size: 0.8125rem;
  font-weight: 650;
}

li span {
  color: oklch(0.45 0.014 160);
  font-size: 0.875rem;
  line-height: 1.5;
}

.production-note {
  margin: 3rem 0 0;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  background: oklch(0.94 0.012 160);
  color: oklch(0.35 0.026 160);
  line-height: 1.6;
}

@media (max-width: 44rem) {
  main {
    padding-top: 4rem;
  }

  h1 {
    font-size: 3rem;
  }

  section {
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-top: 4.5rem;
  }
}

@media (max-width: 28rem) {
  main {
    width: min(100% - 1.25rem, 68rem);
  }

  h1 {
    font-size: 2.4rem;
    line-height: 1.02;
  }

  .actions a {
    width: 100%;
  }
}
</style>
