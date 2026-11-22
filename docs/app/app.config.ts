export default {
  ginkoDocs: {
    theme: {
      preset: 'nuxt',
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
    nav: { links: 'auto', socialIcons: true },
    social: {
      github: 'https://github.com/lupinum-dev/nuxt-email',
      discord: 'https://discord.lupinum.com',
    },
    feedback: { enabled: true },
    analytics: { plausible: { scriptId: 'vkwO2ZsNQtpycIOZdf5cy' } },
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
            'defineProps<{ name: string, actionUrl: string }>()',
            '</script>',
            '',
            '<template>',
            '  <EEmail :subject="`Welcome, ${name}`" lang="en" preview="Your account is ready." class="bg-slate-100 p-6">',
            '    <EContainer class="rounded-lg bg-white p-8">',
            '      <EHeading class="text-2xl font-semibold text-slate-900">Welcome, {{ name }}</EHeading>',
            '      <EText class="text-slate-600">Your account is ready.</EText>',
            '      <EButton :href="actionUrl" class="rounded-md bg-emerald-600 px-5 py-3 text-white">Open dashboard</EButton>',
            '    </EContainer>',
            '  </EEmail>',
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
            en: 'The build converts Tailwind classes into inline styles and keeps the head rules email clients need, including classes in your own Vue components. A production render loads neither Tailwind nor a CSS parser.',
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
