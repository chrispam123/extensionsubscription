import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    // 1. Ignorar carpetas de build y dependencias
    ignores: ["dist", "node_modules", "vite.config.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 2. Configuración específica para archivos TS y TSX
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.chrome, // Crítico para que no marque 'chrome' como error
      },
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Reglas de React Hooks
      ...hooksPlugin.configs.recommended.rules,
      
      // Ajustes para React 17+ (no hace falta importar React en cada archivo)
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // Reglas de TypeScript
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      
      // Desactivar regla que a veces choca con el nuevo sistema de tipos de React
      "react/prop-types": "off"
    },
  }
);
