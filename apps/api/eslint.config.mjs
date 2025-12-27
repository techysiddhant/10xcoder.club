import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist/**', 'server', 'server.js',".bun","node_modules"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
]
