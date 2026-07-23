export default {
  ginkoDocs: {
    site: {
      url: 'https://nuxt-email.lupinum.com',
      name: { en: 'Nuxt Email' },
      description: {
        en: 'Typed transactional email for Nuxt, with email-safe Tailwind v4.',
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
        en: 'Typed templates · Tailwind v4 · Nitro rendering',
      },
      title: {
        en: 'Transactional email, native to Nuxt.',
      },
      description: {
        en: 'Author typed Vue SFCs with Tailwind utilities, then render deterministic HTML, plain text, and subject lines from the same Nitro-native path.',
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
            'import { defineEmail } from \'@lupinum/nuxt-email/define-email\'',
            '',
            'const props = defineProps<{ firstName: string; activationUrl: string }>()',
            'defineEmail({ subject: () => `Welcome, ${props.firstName}` })',
            '</script>',
            '',
            '<template>',
            '  <ETailwind>',
            '    <EHtml lang="en">',
            '      <EHead><title>Activate your account</title></EHead>',
            '      <EBody class="bg-slate-100 p-6">',
            '        <EPreview>Your account is ready.</EPreview>',
            '        <EContainer class="rounded-xl bg-white p-8">',
            '          <EHeading>Welcome, {{ props.firstName }}</EHeading>',
            '          <EButton :href="props.activationUrl" class="bg-blue-600 px-5 py-3 text-white">',
            '            Activate account',
            '          </EButton>',
            '        </EContainer>',
            '      </EBody>',
            '    </EHtml>',
            '  </ETailwind>',
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
          title: { en: 'Tailwind v4, inlined' },
          description: {
            en: 'ETailwind compiles utilities into inline styles and preserves the head rules email clients need, including classes from nested Vue components.',
          },
          icon: 'lucide:paintbrush',
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
            en: 'Eighteen E* components handle presentation tables, MSO button spacers, preview text, fonts, inline code, Markdown, and Tailwind inlining.',
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
          title: { en: 'Conformance with evidence' },
          description: {
            en: 'The ported component behaviors are checked against a pinned React Email 6.9.0 oracle, with intentional differences recorded in a generated report.',
          },
          icon: 'lucide:git-compare',
        },
      ],
    },
  },
}
