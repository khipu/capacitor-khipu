import ionic from '@ionic/eslint-config/recommended.js';
import globals from 'globals';

// @ionic/eslint-config scopes every rule to TypeScript files. Under eslintrc the same
// rules also ran on the JavaScript here (c0c5821 made sure of it), so apply them again,
// minus typescript-eslint's eslint-recommended block: it turns off no-undef,
// no-dupe-keys, no-unreachable and the like because the compiler catches those in
// TypeScript, and nothing compiles the JavaScript. eslintrc only applied it to .ts too.
const JS_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs'];
const forJs = ionic
  .filter((config) => config.name !== 'typescript-eslint/eslint-recommended')
  .map((config) => ({ ...config, files: JS_FILES }));

export default [
  {
    ignores: [
      // eslintrc matched these at any depth: example/dist, android/build, and so on.
      '**/build/',
      '**/dist/',
      // eslintrc skipped dot-directories by default and flat config does not.
      // .claude/worktrees holds whole checkouts of the other release lines.
      '**/.*/',
      // Web bundles that Capacitor copies to the native platforms on every `cap sync`.
      'example/ios/App/App/public/',
      'example/android/app/src/main/assets/public/',
    ],
  },
  ...ionic,
  ...forJs,
  {
    files: ['example/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['scripts/**', '**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
];
