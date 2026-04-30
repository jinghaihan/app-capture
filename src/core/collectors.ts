import type { CaptureOutputPaths, Options } from '../types'
import type { CaptureLogger } from './logger'
import type { CaptureChildProcess } from './process'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { x } from 'tinyexec'
import { closeStream, escapePredicateString } from '../utils'
import { attachChildOutput } from './process'

export interface ScreenshotCapture {
  stop: () => void
}

export async function startTcpdump(
  options: Options,
  outputs: CaptureOutputPaths,
  children: CaptureChildProcess[],
  logger: CaptureLogger,
): Promise<void> {
  await x('sudo', ['-v'], {
    throwOnError: true,
    nodeOptions: { stdio: 'inherit' },
  })

  const args = [
    options.tcpdumpBin,
    '-i',
    options.tcpdumpInterface!,
    '-s',
    '0',
    '-B',
    '4096',
    '-w',
    outputs.networkPcap,
  ]

  if (options.tcpdumpFilter)
    args.push(options.tcpdumpFilter)

  logger.command('sudo', args)
  const proc = x('sudo', args)
  children.push({ name: 'tcpdump', proc, stopSignal: 'SIGINT' })
  attachChildOutput('tcpdump', proc, logger)
  logger.path('tcpdump writing', outputs.networkPcap)
}

export function startSystemLog(
  options: Options,
  outputs: CaptureOutputPaths,
  children: CaptureChildProcess[],
  logger: CaptureLogger,
): void {
  if (!options.systemLogs)
    return

  const predicate = options.processPredicate || createProcessPredicate(options.processNames)

  if (!predicate) {
    logger.warn('system log skipped because no processNames or processPredicate was provided.')
    return
  }

  const args = [
    'stream',
    '--style',
    options.logStyle,
    '--info',
    '--debug',
    '--predicate',
    predicate,
  ]

  logger.command('log', args)
  const proc = x('log', args, {
    nodeOptions: {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  })

  proc.process?.stderr?.on('data', chunk => logger.child('log stream', 'stderr', chunk))
  children.push({ name: 'log stream', proc, stopSignal: 'SIGINT' })
  logger.path('macOS app log writing', outputs.appLog)

  const appLog = createWriteStream(outputs.appLog, { flags: 'a' })
  proc.process?.stdout?.pipe(appLog)
  proc.then(() => closeStream(appLog), () => closeStream(appLog))
}

export async function startScreenshots(options: Options, outputs: CaptureOutputPaths, logger: CaptureLogger): Promise<ScreenshotCapture | undefined> {
  if (!options.screenshots)
    return

  await mkdir(outputs.screenshotsDir, { recursive: true })
  let count = 0

  const capture = () => {
    count += 1
    const filename = `screen-${String(count).padStart(6, '0')}.png`
    const path = resolve(outputs.screenshotsDir, filename)
    x('screencapture', ['-x', path]).then(() => {}, () => {})
  }

  capture()
  const timer = setInterval(capture, options.screenshotInterval)
  logger.path('screenshots writing', outputs.screenshotsDir)

  return {
    stop: () => clearInterval(timer),
  }
}

function createProcessPredicate(processNames: string[]): string | undefined {
  if (!processNames.length)
    return undefined

  return processNames
    .flatMap(name => [`process == "${escapePredicateString(name)}"`, `process CONTAINS[c] "${escapePredicateString(name)}"`])
    .join(' OR ')
}
