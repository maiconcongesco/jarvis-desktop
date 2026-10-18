import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src-tauri', 'src/_upstream'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Regra nova (v7, voltada ao React Compiler). Os usos atuais são
      // sincronização deliberada (rascunho do formulário segue o store,
      // fetch inicial em efeito); reescrever tudo como estado derivado é
      // refatoração fora do escopo do lint. Reavaliar ao adotar o Compiler.
      'react-hooks/set-state-in-effect': 'off',
      // Convenção do projeto: `_` marca variável/argumento intencionalmente
      // não usado (ex.: `for await (const _ of stream)`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
