module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended'
  ],
  plugins: ['import'],
  ignorePatterns: ['coverage/', 'node_modules/', 'uploads/', '*.json'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/tests/**'] }]
  },
  overrides: [
    {
      files: ['tests/**/*.{js,jsx}'],
      env: { jest: true }
    }
  ]
};
