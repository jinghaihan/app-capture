import type { CaptureManifest, CaptureResult, CaptureStatus, NetworkProxyState, Options } from '../types'
import type { ScreenshotCapture } from './collectors'
import type { CaptureChildProcess } from './process'
import type { CaptureProgress } from './progress'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { MANIFEST_FILENAME } from '../constants'
import { closeStream, getErrorMessage } from '../utils'
import { startScreenshots, startSystemLog, startTcpdump } from './collectors'
import { createCaptureLogger } from './logger'
import { getMitmArgs, startMitm, writeMitmFiles } from './mitm'
import { createOutputPaths, createRunId, writeManifest } from './paths'
import { detectDefaultInterface, resolveProxyPort, waitForPort } from './port'
import { attachChildOutput, stopChild } from './process'
import { startCaptureProgress } from './progress'
import { enableSystemProxy, readNetworkProxyState, restoreSystemProxy } from './proxy'

export async function startCapture(options: Options): Promise<CaptureResult> {
  const startedAt = new Date().toISOString()
  const runtimeOptions = {
    ...options,
    proxyPort: await resolveProxyPort(options),
    tcpdumpInterface: options.tcpdump ? options.tcpdumpInterface || await detectDefaultInterface() : options.tcpdumpInterface,
  }
  const runId = createRunId(runtimeOptions.name, startedAt)
  const runDir = resolve(runtimeOptions.cwd, runtimeOptions.outDir, runId)
  const outputs = createOutputPaths(runDir)
  const manifestPath = resolve(runDir, MANIFEST_FILENAME)
  const children: CaptureChildProcess[] = []
  let screenshots: ScreenshotCapture | undefined
  let progress: CaptureProgress | undefined
  let originalProxyState: NetworkProxyState | undefined
  let proxyEnabled = false

  const manifest: CaptureManifest = {
    runId,
    name: runtimeOptions.name,
    runDir,
    startedAt,
    status: 'running',
    options: runtimeOptions,
    outputs,
  }

  await mkdir(outputs.bodiesDir, { recursive: true })
  await writeManifest(manifestPath, manifest)

  const captureLog = createWriteStream(outputs.captureLog, { flags: 'a' })
  const logger = createCaptureLogger(captureLog)

  async function stop(status: CaptureStatus, reason: string): Promise<CaptureResult> {
    progress?.stop()
    screenshots?.stop()

    for (const child of [...children].reverse())
      await stopChild(child, logger)

    if (runtimeOptions.systemProxy && runtimeOptions.restoreProxy && originalProxyState)
      await restoreSystemProxy(runtimeOptions.networkService, originalProxyState)

    if (proxyEnabled)
      logger.success(`Restored proxy settings for ${runtimeOptions.networkService}`)

    manifest.status = status
    manifest.stopReason = reason
    manifest.endedAt = new Date().toISOString()
    await writeManifest(manifestPath, manifest)

    await closeStream(captureLog)

    return {
      runId,
      runDir,
      manifestPath,
      status,
    }
  }

  try {
    logger.path('Capture run directory', runDir)

    await writeMitmFiles(runtimeOptions, outputs)
    logger.path('Wrote mitm addon', outputs.mitmAddon)
    logger.command(runtimeOptions.mitmBin, getMitmArgs(runtimeOptions, outputs))
    const mitm = startMitm(runtimeOptions, outputs)
    children.push({ name: 'mitmdump', proc: mitm, stopSignal: 'SIGTERM' })
    attachChildOutput('mitmdump', mitm, logger)

    await waitForPort(runtimeOptions.proxyHost, runtimeOptions.proxyPort, 10000)
    logger.success(`mitmdump listening on ${runtimeOptions.proxyHost}:${runtimeOptions.proxyPort}`)

    if (runtimeOptions.tcpdump && runtimeOptions.tcpdumpInterface) {
      await startTcpdump(runtimeOptions, outputs, children, logger)
    }
    else if (runtimeOptions.tcpdump) {
      logger.warn('tcpdump skipped because no default network interface was detected.')
    }

    startSystemLog(runtimeOptions, outputs, children, logger)
    screenshots = await startScreenshots(runtimeOptions, outputs, logger)

    if (runtimeOptions.systemProxy) {
      originalProxyState = await readNetworkProxyState(runtimeOptions.networkService)
      assertProxyStateCanBeRestored(originalProxyState)

      manifest.proxy = {
        original: originalProxyState,
        applied: {
          networkService: runtimeOptions.networkService,
          host: runtimeOptions.proxyHost,
          port: runtimeOptions.proxyPort,
        },
      }
      await writeManifest(manifestPath, manifest)

      await enableSystemProxy(runtimeOptions.networkService, runtimeOptions.proxyHost, runtimeOptions.proxyPort)
      proxyEnabled = true
      logger.success(`Enabled HTTP/HTTPS proxy for ${runtimeOptions.networkService}`)
    }

    logger.info('Capture is running. Press Command-C to stop.')
    progress = startCaptureProgress(outputs, logger)

    const stopReason = await Promise.race([
      waitForStopSignal(),
      mitm.then(result => `mitmdump exited with code ${result.exitCode ?? 'unknown'}`),
    ])

    const status = stopReason.startsWith('mitmdump exited') ? 'failed' : 'stopped'

    return await stop(status, stopReason)
  }
  catch (error) {
    await stop('failed', getErrorMessage(error))
    throw error
  }
}

function waitForStopSignal(): Promise<NodeJS.Signals> {
  return new Promise((resolveSignal) => {
    const stop = (signal: NodeJS.Signals) => {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
      resolveSignal(signal)
    }

    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}

function assertProxyStateCanBeRestored(state: NetworkProxyState): void {
  for (const [kind, settings] of Object.entries(state)) {
    if (settings.enabled && settings.authenticated)
      throw new Error(`Cannot safely manage system proxy because the original ${kind.toUpperCase()} proxy uses authentication.`)
  }
}
