const globalsLib = require('globals');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['coverage/', 'node_modules/', 'uploads/', '*.json'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globalsLib.node
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'import/no-unresolved': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['tests/**', 'eslint.config.js'] }],
      camelcase: ['warn', { properties: 'always', ignoreDestructuring: false }],
      quotes: ['error', 'double', { avoidEscape: true }]
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globalsLib.jest
      }
    }
  }
];
