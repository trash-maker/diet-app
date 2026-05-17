import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const kitFiles = [
  'src/components/**/*.{ts,tsx}',
  'src/hooks/**/*.{ts,tsx}',
  'src/lib/**/*.{ts,tsx}',
]

export default defineConfig([
  globalIgnores(['dist']),
  // installed kit files — relax strict rules, suppress their own eslint-disable comments
  {
    files: kitFiles,
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/use-memo': 'off',
      'no-console': 'off',
    },
  },
  // application code — full rules
  {
    files: ['src/resources/**/*.{ts,tsx}', 'src/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
])
