import { defineConfig, mergeCatalogRules } from 'pncat'

export default defineConfig({
  catalogRules: mergeCatalogRules([
    {
      name: 'inlined',
      /// keep-sorted
      match: [
        '@antfu/utils',
        'get-port',
        'kill-port',
        'tildify',
      ],
      priority: 0,
    },
  ]),
  postRun: 'eslint --fix "**/package.json" "**/pnpm-workspace.yaml"',
})
