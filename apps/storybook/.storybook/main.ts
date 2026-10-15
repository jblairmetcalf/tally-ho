import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: [
    '../src/**/*.stories.tsx',
    '../../../packages/ui/src/**/*.stories.tsx',
    '../../../packages/app/src/**/*.stories.tsx',
  ],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  viteFinal: (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), tailwindcss()]
    return cfg
  },
}

export default config
