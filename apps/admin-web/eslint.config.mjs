import nextConfig from "@packages/config/eslint/next";
import fsdConfig from "@packages/config/eslint/fsd";
import codeHealthConfig from "@packages/config/eslint/code-health";

const config = [
  ...nextConfig,
  ...fsdConfig(),
  ...codeHealthConfig,
  {
    files: ["src/app/**/*.{ts,tsx}", "src/_pages/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
