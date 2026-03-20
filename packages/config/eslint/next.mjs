import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

/**
 * Next.js(Flat Config) 공용 preset
 * - Next 권장(core-web-vitals + typescript)을 베이스로
 * - 미사용 import 자동 정리 규칙 추가
 * - import 정렬/검증 약간 추가
 * - prettier와 충돌하는 ESLint 룰 비활성화
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      "unused-imports": unusedImports,
      import: importPlugin,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "import/no-duplicates": "error",
      "import/newline-after-import": "warn",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettier,
]);
