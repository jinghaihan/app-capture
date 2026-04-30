import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  exports: true,
  clean: true,
  copy: [
    { from: 'src/core/mitm_addon.py', to: 'dist', flatten: true },
  ],
})
