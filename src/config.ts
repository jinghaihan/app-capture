import type { CommandOptions, ConfigOptions, Options } from './types'
import process from 'node:process'
import { toArray } from '@antfu/utils'
import { createConfigLoader } from 'unconfig'
import { DEFAULT_OPTIONS } from './constants'

function normalizeConfig(options: Partial<CommandOptions>) {
  // interop
  if ('default' in options)
    options = options.default as Partial<CommandOptions>

  delete (options as Partial<CommandOptions> & { '--'?: string[] })['--']

  return options
}

export async function readConfig(options: Partial<ConfigOptions>) {
  const loader = createConfigLoader<ConfigOptions>({
    sources: [
      {
        files: ['app-capture.config'],
        extensions: ['ts'],
      },
    ],
    cwd: options.cwd || process.cwd(),
    merge: false,
  })
  const config = await loader.load()
  return config.sources.length ? normalizeConfig(config.config) : {}
}

export async function resolveConfig(options: Partial<CommandOptions>): Promise<Options> {
  const defaults = structuredClone(DEFAULT_OPTIONS)
  options = normalizeConfig(options)

  const configOptions = await readConfig(options)
  const merged = { ...defaults, ...configOptions, ...options }

  merged.processNames = toArray(merged.processNames)
  merged.hosts = toArray(merged.hosts)
  merged.paths = toArray(merged.paths)

  return merged as Options
}
