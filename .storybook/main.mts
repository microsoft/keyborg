import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../tests/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  typescript: {
    check: false,
    reactDocgen: false,
  },
};

export default config;
