// eslint.config.js — configuración ESLint en formato flat config (v9+)
//
// CONCEPTO: ESLint v9 abandonó .eslintrc.* por un formato basado en
// un archivo JS explícito. Más verboso pero más predecible:
// ves exactamente qué reglas aplican y a qué archivos.

import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Archivos que ESLint debe ignorar
    ignores: ['dist/**', 'node_modules/**']
  },
  {
    // Archivos que aplican estas reglas
    files: ['src/**/*.ts'],

    // Extiende las reglas recomendadas de typescript-eslint
    extends: [
      ...tseslint.configs.recommended,
    ],

    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'warn'
    }
  }
)
