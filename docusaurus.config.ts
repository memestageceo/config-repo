import { themes as prismThemes } from 'prism-react-renderer';
import type { Config, Plugin } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const disableBrokenWebpackBar = (): Plugin => ({
  name: 'disable-broken-webpackbar',
  configureWebpack(config) {
    const plugins = (config.plugins ?? []).filter(
      (plugin) => plugin?.constructor?.name !== 'WebpackBarPlugin',
    );

    return {
      plugins,
      mergeStrategy: {
        plugins: 'replace',
      },
    };
  },
});

const config: Config = {
  title: 'DevOps, K8s & Cloud',
  tagline: 'Configs that work, served with explanations',
  favicon: 'img/favicon.ico',

  url: process.env.SITE_URL ?? 'https://your-domain.com',
  baseUrl: '/',
  storage: {
    type: 'localStorage',
    namespace: true,
  },

  organizationName: 'memestageceo',
  projectName: 'config-repo',

  onBrokenLinks: 'warn',
  future: {
    v4: true,
    faster: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
  plugins: [disableBrokenWebpackBar],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/memestageceo/config-repo/edit/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          numberPrefixParser: true,
        },
        blog: {
          showReadingTime: true,
          blogTitle: 'dev latest',
          blogDescription:
            'Configs that work, served with Explanations',
          postsPerPage: 10,
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 'ALL',
          editUrl:
            'https://github.com/memestageceo/config-repo/edit/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
    navbar: {
      title: 'Aditya Raj',
      logo: {
        alt: 'DevOps Docs Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://github.com/memestageceo/config-repo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Kubernetes', to: '/docs/kubernetes' },
            { label: 'Debugging', to: '/docs/debugging' },
          ],
        },
        {
          title: 'Blog',
          items: [
            { label: 'Latest posts', to: '/blog' },
            { label: 'Authors', to: '/blog/authors' },
          ],
        },
        {
          title: 'Author',
          items: [
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/in/aditya-raj-content-creator/',
            },
            {
              label: 'YouTube',
              href: 'https://www.youtube.com/@memestagestartup',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/memestageceo/config-repo',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Aditya Raj. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'docker', 'python', 'json', 'ini'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
