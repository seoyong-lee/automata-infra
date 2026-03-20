/**
 * Code Health: 파일/함수 라인 제한 + 복잡도 제한
 *
 * `storytalk-web`의 공용 클라이언트 린트 방향을 그대로 가져오되,
 * 현재 admin-web이 `_pages`로 분리되는 과도기인 점을 감안해
 * screen layer는 우선 경고 레벨로 운영합니다.
 */
import importPlugin from "eslint-plugin-import";
import oneExportRule from "./rules/one-export-per-ui-file.mjs";

const uiExportPlugin = {
  rules: {
    "one-export-per-ui-file": oneExportRule,
  },
};

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": [
        "error",
        {
          max: 60,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["error", 12],
      "max-depth": ["error", 4],
    },
  },
  {
    files: [
      "src/widgets/**/ui/**/*.{ts,tsx}",
      "src/features/**/ui/**/*.{ts,tsx}",
      "src/entities/**/ui/**/*.{ts,tsx}",
      "src/shared/ui/**/*.{ts,tsx}",
    ],
    plugins: { "ui-export": uiExportPlugin },
    rules: {
      "ui-export/one-export-per-ui-file": "error",
      "max-lines": [
        "error",
        {
          max: 130,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "error",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["error", 10],
      "max-depth": ["error", 3],
    },
  },
  {
    files: [
      "src/widgets/**/model/**/*.{ts,tsx}",
      "src/features/**/model/**/*.{ts,tsx}",
      "src/entities/**/model/**/*.{ts,tsx}",
    ],
    rules: {
      "max-lines": [
        "error",
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/_pages/**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 250,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["warn", 12],
    },
  },
  {
    files: ["src/shared/lib/**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ["src/**/effects/**/*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": [
        "error",
        {
          max: 25,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["error", 6],
      "max-depth": ["error", 2],
    },
  },
  {
    files: ["src/**/use*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": [
        "error",
        {
          max: 45,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["error", 8],
      "max-depth": ["error", 3],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { import: importPlugin },
    rules: {
      "import/no-default-export": "error",
    },
  },
  {
    files: [
      "src/app/**/page.{ts,tsx}",
      "src/app/**/layout.{ts,tsx}",
      "src/app/**/loading.{ts,tsx}",
      "src/app/**/error.{ts,tsx}",
      "src/app/**/not-found.{ts,tsx}",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
];
