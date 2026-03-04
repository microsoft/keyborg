import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../tests/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
};

export default config;
