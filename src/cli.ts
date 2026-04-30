import type { CAC } from 'cac'
import type { CaptureStatus, CommandOptions } from './types'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { cac } from 'cac'
import tildify from 'tildify'
import { resolveConfig } from './config'
import { NAME, VERSION } from './constants'
import { startCapture } from './core/capture'

try {
  const cli: CAC = cac(NAME)

  cli
    .command('', 'Collects HTTP, WebSocket, network, logs, and screenshots into a unified timeline for analyzing app behavior')
    .option('--cwd <cwd>', 'Working directory')
    .option('--name <name>', 'Name of the capture')
    .option('--process-names <processNames>', 'Process names used to filter macOS system logs')
    .option('--process-predicate <predicate>', 'Custom macOS log stream predicate')
    .option('--hosts <hosts>', 'Host filters for HTTP and WebSocket flows')
    .option('--paths <paths>', 'Path substring filters for HTTP and WebSocket flows')
    .option('--out-dir <outDir>', 'Directory where capture runs are written')
    .option('--network-service <networkService>', 'macOS network service to configure')
    .option('--proxy-host <proxyHost>', 'Local proxy host')
    .option('--proxy-port <proxyPort>', 'Preferred local proxy port')
    .option('--auto-pick-proxy-port', 'Choose another free proxy port when the preferred port is unavailable')
    .option('--kill-proxy-port', 'Stop an existing process that is already listening on the proxy port')
    .option('--system-proxy', 'Configure the macOS system HTTP/HTTPS proxy')
    .option('--restore-proxy', 'Restore the original macOS proxy settings when capture stops')
    .option('--upstream-proxy <upstreamProxy>', 'Optional upstream proxy URL')
    .option('--mitm-bin <mitmBin>', 'mitmproxy-compatible executable name or path')
    .option('--tcpdump', 'Record packet-level traffic with tcpdump')
    .option('--tcpdump-bin <tcpdumpBin>', 'tcpdump executable name or path')
    .option('--tcpdump-interface <tcpdumpInterface>', 'Network interface passed to tcpdump')
    .option('--tcpdump-filter <tcpdumpFilter>', 'BPF filter passed to tcpdump')
    .option('--system-logs', 'Record macOS unified logs with log stream')
    .option('--log-style <logStyle>', 'Output style passed to log stream')
    .option('--screenshots', 'Capture periodic screenshots')
    .option('--screenshot-interval <screenshotInterval>', 'Interval between screenshots in milliseconds')
    .ignoreOptionDefaultValue()
    .allowUnknownOptions()
    .action(async (options: Partial<CommandOptions>) => {
      try {
        p.intro(`${c.yellow`${NAME} `}${c.dim`v${VERSION}`}`)

        const config = await resolveConfig(options)
        const result = await startCapture(config)

        p.outro(`${c.bold('Capture')} ${formatStatus(result.status)}. ${c.dim('Manifest:')} ${c.cyan(tildify(result.manifestPath))}`)
      }
      catch (error) {
        handleError(error)
      }
    })

  cli.help()
  cli.version(VERSION)
  cli.parse()
}
catch (error) {
  handleError(error)
}

function handleError(error: unknown): never {
  p.cancel(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function formatStatus(status: CaptureStatus): string {
  if (status === 'stopped')
    return c.green(status)

  if (status === 'failed')
    return c.red(status)

  return c.yellow(status)
}
