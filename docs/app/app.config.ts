export default {
  ginkoDocs: {
    theme: {
      neutral: 'custom',
      primary: 'custom',
      codeBlocks: 'adaptive',
    },
    site: {
      url: 'https://nuxt-email.lupinum.com',
      name: { en: 'Nuxt Email' },
      description: {
        en: 'Typed transactional email for Nuxt, with email-safe Tailwind v4.',
      },
      logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      docsSidebarSwitcher: 'tabs',
      legalLinks: [
        { label: { en: 'Legal notice' }, to: 'https://lupinum.com/impressum' },
        { label: { en: 'Privacy' }, to: 'https://lupinum.com/datenschutz' },
      ],
    },
    social: {
      github: 'https://github.com/lupinum-dev/nuxt-email',
      discord: 'https://discord.gg/RPH6SeA36N',
    },
    feedback: { enabled: true },
    analytics: { plausible: { scriptId: 'vkwO2ZsNQtpycIOZdf5cy' } },
    banner: {
      enabled: true,
      id: 'nuxt-email-1-beta-1',
      text: {
        en: '1.0.0-beta.1 is published on npm\'s next tag. The three-client beta smoke test passed; stable still requires the full eight-client checklist and an external transactional beta.',
      },
      link: {
        label: { en: 'Read the changelog' },
        to: { en: 'https://github.com/lupinum-dev/nuxt-email/blob/main/CHANGELOG.md' },
      },
      showOnLanding: true,
    },
    repository: {
      url: 'https://github.com/lupinum-dev/nuxt-email',
      branch: 'main',
      contentDirectory: 'docs/content',
    },
    landing: {
      eyebrow: {
        en: 'Typed templates · Tailwind v4 · Nitro rendering',
      },
      title: {
        en: 'Transactional email, native to Nuxt.',
      },
      description: {
        en: 'Author typed Vue single-file components with Tailwind utilities, then render deterministic HTML, plain text, and subject lines from the same Nitro-native path.',
      },
      primary: {
        label: { en: 'Get started' },
        to: { en: '/docs/getting-started' },
      },
      secondary: {
        label: { en: 'View on GitHub' },
        to: { en: 'https://github.com/lupinum-dev/nuxt-email' },
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
            'const props = defineProps<{',
            '  firstName: string',
            '  activationUrl: string',
            '}>()',
            '',
            'defineEmail({',
            '  subject: () => `Welcome aboard, ${props.firstName}`,',
            '})',
            '</script>',
            '',
            '<template>',
            '  <ETailwind>',
            '    <EHtml lang="en">',
            '      <EHead>',
            '        <title>Activate your account</title>',
            '      </EHead>',
            '      <EBody class="m-0 bg-slate-100 p-6">',
            '        <EPreview>Your account is ready.</EPreview>',
            '        <EContainer class="rounded-lg bg-white p-6">',
            '          <EHeading class="m-0 text-2xl text-slate-900">Welcome, {{ firstName }}</EHeading>',
            '          <EText class="text-slate-600">Finish setting up your account.</EText>',
            '          <EButton class="rounded-md bg-blue-600 px-5 py-3 text-white" :href="activationUrl">',
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
            en: 'Eighteen built-in E* components handle email structure and styling; configured applications can add syntax-highlighted ECodeBlock.',
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
            en: 'Covered behaviors are compared with a fixed React Email 6.9.0 version. A generated report records intentional differences.',
          },
          icon: 'lucide:git-compare',
        },
      ],
    },
  },
}
