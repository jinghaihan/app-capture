import type { Result } from 'tinyexec'
import type { CaptureOutputPaths, Options } from '../types'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { x } from 'tinyexec'

const mitmAddonPath = new URL('./mitm_addon.py', import.meta.url)

export async function writeMitmFiles(options: Options, outputs: CaptureOutputPaths): Promise<void> {
  await writeFile(outputs.mitmConfig, `${JSON.stringify({
    hosts: options.hosts,
    paths: options.paths,
    httpLog: outputs.httpLog,
    websocketLog: outputs.websocketLog,
    bodiesDir: outputs.bodiesDir,
  }, null, 2)}\n`, 'utf8')

  await writeFile(outputs.mitmAddon, await readFile(mitmAddonPath, 'utf8'), 'utf8')
}

export function getMitmArgs(options: Options, outputs: CaptureOutputPaths): string[] {
  const args = [
    '--listen-host',
    options.proxyHost,
    '--listen-port',
    String(options.proxyPort),
    '-s',
    outputs.mitmAddon,
  ]

  if (options.upstreamProxy)
    args.unshift('--mode', `upstream:${options.upstreamProxy}`)

  return args
}

export function startMitm(options: Options, outputs: CaptureOutputPaths): Result {
  return x(options.mitmBin, getMitmArgs(options, outputs), {
    nodeOptions: {
      env: {
        ...process.env,
        APP_CAPTURE_MITM_CONFIG: outputs.mitmConfig,
      },
    },
  })
}
