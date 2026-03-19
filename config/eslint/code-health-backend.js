const importPlugin = require('eslint-plugin-import');

module.exports = [
  {
    files: ['services/**/*.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 70, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 12],
      'max-depth': ['error', 4],
    },
  },
  {
    files: ['services/**/handler.ts'],
    rules: {
      'max-lines': ['error', { max: 180, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 8],
      'max-depth': ['error', 3],
    },
  },
  {
    files: ['services/**/index.ts'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
    },
  },
  {
    files: ['services/**/repo/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 280, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 70, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 14],
      'max-depth': ['error', 4],
    },
  },
  {
    files: ['services/**/*.ts'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-default-export': 'error',
    },
  },
];
