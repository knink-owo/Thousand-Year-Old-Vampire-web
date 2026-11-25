import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * 只保留"正确性"规则（essential + recommended），不做风格收紧：
 * 缩进、换行、属性排序等交给编辑器，避免一次性产生大量无意义 diff。
 * 后续如需风格门禁，再加 prettier 或 vue/strongly-recommended。
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-singlefile/**', 'node_modules/**', '.tmp/**', 'src-data/**', 'tools/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
)
