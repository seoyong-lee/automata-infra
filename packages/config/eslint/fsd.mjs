/**
 * FSD (Feature-Sliced Design) ESLint rules
 * - layers-slices: 레이어 의존성 방향 강제 (하위→상위 금지)
 * - public-api: index.ts 등 public entry만 import 허용 (no-internal-modules)
 * - import-order: FSD 레이어 순서로 import 정렬
 */
import boundariesPlugin from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

const FS_LAYERS = ["app", "pages", "widgets", "features", "entities", "shared"];
const FS_SEGMENTS = ["ui", "model", "lib", "api", "config", "assets", "types"];

function getBoundariesElements() {
  const elements = [];

  for (const layer of FS_LAYERS) {
    const folder = layer === "pages" ? "_pages" : layer;
    elements.push({
      type: layer,
      pattern: `src/${folder}/**/*.{ts,tsx}`,
      mode: "file",
    });
  }

  for (const layer of FS_LAYERS) {
    const folder = layer === "pages" ? "_pages" : layer;
    elements.push({
      type: `gm_${layer}`,
      pattern: `src/${folder}/_*/**/*.{ts,tsx}`,
      mode: "file",
    });
  }

  return elements;
}

function getLayerRules() {
  const rules = [];

  for (let index = 0; index < FS_LAYERS.length; index += 1) {
    const layer = FS_LAYERS[index];
    if (layer === "shared") {
      rules.push({ from: "shared", allow: "shared" });
    } else if (layer === "app") {
      rules.push({
        from: "app",
        allow: ["app", "pages", "widgets", "features", "entities", "shared"],
      });
    } else {
      rules.push({
        from: layer,
        allow: [layer, ...FS_LAYERS.slice(index + 1)],
      });
    }
  }

  for (let index = 0; index < FS_LAYERS.length; index += 1) {
    const layer = FS_LAYERS[index];
    rules.push({
      from: `gm_${layer}`,
      allow: [layer, ...FS_LAYERS.slice(index + 1)],
    });
  }

  return rules;
}

function getPublicApiAllowPatterns() {
  const layersReg = FS_LAYERS.filter((layer) => layer !== "shared").join("|");
  const segmentsReg = [
    ...FS_SEGMENTS,
    ...FS_SEGMENTS.map((segment) => `${segment}.*`),
  ].join("|");

  return [
    `**/*(${layersReg})/!(${segmentsReg})`,
    `**/*(${layersReg})/!(${segmentsReg})/!(${segmentsReg})`,
    `**/*shared/*(${segmentsReg})/!(${segmentsReg})`,
    `**/*shared/*(${segmentsReg})`,
    `**/node_modules/**`,
    `**/*shared/_*`,
    `**/*shared/_*/*`,
    "model/**",
    "ui/**",
    "lib/**",
    "config/**",
    "api/**",
    "types/**",
    "**/_pages/*",
    "**/_pages/*/**",
    "**/shared/api/**",
    "**/shared/lib/**",
    "**/shared/ui/**",
    "@/lib/**",
    "@packages/*",
    "@packages/*/**",
  ];
}

function getRestrictedPackageImportPatterns() {
  return [
    {
      group: ["@packages/*/src/**"],
      message:
        "패키지 내부 구현 경로를 직접 import할 수 없습니다. 패키지 public API(@packages/*)만 사용하세요.",
    },
    {
      group: ["@packages/graphql/src/**", "@packages/graphql/generated/**"],
      message:
        "GraphQL generated/internal 경로를 직접 import할 수 없습니다. @packages/graphql 또는 entity adapter를 사용하세요.",
    },
  ];
}

function getRestrictedGraphqlTypeExposurePatterns() {
  return [
    {
      group: ["@packages/graphql"],
      importNamePattern:
        "^[A-Z].*(Query|Mutation|QueryVariables|MutationVariables|Fragment)$",
      message:
        "generated GraphQL 타입을 entities 밖에서 직접 사용하지 마세요. entity model 타입 또는 adapter 결과를 사용하세요.",
    },
  ];
}

export default function fsdConfig() {
  return [
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      plugins: {
        boundaries: boundariesPlugin,
        import: importPlugin,
      },
      settings: {
        "boundaries/include": ["src/**/*.ts", "src/**/*.tsx"],
        "boundaries/elements": getBoundariesElements(),
        "import/resolver": { typescript: true },
      },
      rules: {
        "boundaries/element-types": [
          "error",
          {
            default: "disallow",
            message:
              'FSD 규칙 위반: "${file.type}" 레이어에서 "${dependency.type}" 레이어를 import할 수 없습니다.',
            rules: getLayerRules(),
          },
        ],
        "import/order": [
          "warn",
          {
            alphabetize: { order: "asc", caseInsensitive: true },
            pathGroups: FS_LAYERS.map((layer) => ({
              pattern: `**/?(*)${layer}{,/**}`,
              group: "internal",
              position: "after",
            })),
            pathGroupsExcludedImportTypes: ["builtin"],
            groups: [
              "builtin",
              "external",
              "internal",
              "parent",
              "sibling",
              "index",
            ],
          },
        ],
        "import/no-internal-modules": [
          "error",
          { allow: getPublicApiAllowPatterns() },
        ],
        "no-restricted-imports": [
          "error",
          {
            patterns: getRestrictedPackageImportPatterns(),
          },
        ],
      },
    },
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      ignores: ["src/entities/**/*.ts", "src/entities/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "warn",
          {
            patterns: getRestrictedGraphqlTypeExposurePatterns(),
          },
        ],
      },
    },
  ];
}
