export default {
  ginkoDocs: {
    site: {
      url: 'https://nuxt-email.lupinum.com',
      name: { en: 'Nuxt Email' },
      description: {
        en: 'Typed Vue email authoring and deterministic server-side rendering for Nuxt.',
      },
      logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      docsSidebarSwitcher: 'tabs',
    },
    social: { github: 'https://github.com/Mat4m0/nuxt-email' },
    repository: {
      url: 'https://github.com/Mat4m0/nuxt-email',
      branch: 'main',
      contentDirectory: 'docs-site/content',
    },
    landing: {
      eyebrow: {
        en: 'Release candidate 0.1.0 — publishing gates still open',
      },
      title: {
        en: 'Write emails as Vue. Render them on the server.',
      },
      description: {
        en: 'Author transactional emails as ordinary Vue SFCs and render deterministic HTML and plain text from Nitro. Email-safe primitives are checked byte-for-byte against a pinned React Email oracle.',
      },
      primary: {
        label: { en: 'Get started' },
        to: { en: '/docs/getting-started' },
      },
      secondary: {
        label: { en: 'View on GitHub' },
        to: { en: 'https://github.com/Mat4m0/nuxt-email' },
      },
      hero: {
        media: {
          type: 'code',
          filename: 'app/emails/welcome.vue',
          language: 'vue',
          code: [
            '<script setup lang="ts">',
            'defineProps<{ firstName: string; activationUrl: string }>()',
            '</script>',
            '',
            '<template>',
            '  <EHtml lang="en">',
            '    <EHead><title>Activate your account</title></EHead>',
            '    <EBody>',
            '      <EPreview>Your account is ready.</EPreview>',
            '      <EContainer>',
            '        <EHeading>Welcome, {{ firstName }}</EHeading>',
            '        <EButton :href="activationUrl" :style="{ padding: \'12px 20px\' }">',
            '          Activate account',
            '        </EButton>',
            '      </EContainer>',
            '    </EBody>',
            '  </EHtml>',
            '</template>',
          ].join('\n'),
        },
      },
      features: [
        {
          title: { en: 'Typed, name-checked rendering' },
          description: {
            en: 'renderEmail(\'welcome\', props) is generated from app/emails/. Unknown names, missing props, and wrong types fail at compile time.',
          },
          icon: 'lucide:shield-check',
        },
        {
          title: { en: 'Checked against React Email' },
          description: {
            en: 'Every email-safety behavior is compared to a pinned React Email 6.9.0 oracle. The generated conformance report is the source of truth.',
          },
          icon: 'lucide:git-compare',
        },
        {
          title: { en: 'Deterministic HTML and plain text' },
          description: {
            en: 'Two renders of the same template and props return byte-identical HTML and a matching plain-text fallback. No IDs, timestamps, or hydration payload.',
          },
          icon: 'lucide:copy-check',
        },
        {
          title: { en: 'Outlook-safe primitives' },
          description: {
            en: 'Nineteen E* components handle presentation tables, MSO button spacers, preview text, fonts, code, Markdown, and Tailwind inlining.',
          },
          icon: 'lucide:mail-check',
        },
        {
          title: { en: 'Development preview' },
          description: {
            en: 'Open /__email in dev to inspect preview, exact HTML, and plain text with sibling fixtures. Preview routes and fixtures never reach production.',
          },
          icon: 'lucide:eye',
        },
        {
          title: { en: 'Tailwind, inlined' },
          description: {
            en: 'Wrap a document in ETailwind and utility classes are inlined into each element\'s style — including classes emitted inside nested components.',
          },
          icon: 'lucide:paintbrush',
        },
      ],
    },
  },
}
