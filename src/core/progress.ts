import type { CaptureOutputPaths } from '../types'
import type { CaptureLogger } from './logger'
import { readdir, stat } from 'node:fs/promises'
import { CAPTURE_PROGRESS_INTERVAL } from '../constants'

export interface CaptureProgress {
  stop: () => void
}

export function startCaptureProgress(outputs: CaptureOutputPaths, logger: CaptureLogger): CaptureProgress {
  let stopped = false
  let writing = false

  const writeProgress = () => {
    if (writing)
      return

    writing = true
    collectProgress(outputs)
      .then((message) => {
        if (!stopped)
          logger.progress(message)
      })
      .finally(() => {
        writing = false
      })
  }

  writeProgress()
  const timer = setInterval(writeProgress, CAPTURE_PROGRESS_INTERVAL)
  timer.unref()

  return {
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}

async function collectProgress(outputs: CaptureOutputPaths): Promise<string> {
  const [httpSize, websocketSize, bodyCount, pcapSize, appLogSize] = await Promise.all([
    getFileSize(outputs.httpLog),
    getFileSize(outputs.websocketLog),
    countFiles(outputs.bodiesDir),
    getFileSize(outputs.networkPcap),
    getFileSize(outputs.appLog),
  ])

  return [
    'Recording...',
    `http=${formatBytes(httpSize)}`,
    `ws=${formatBytes(websocketSize)}`,
    `bodies=${bodyCount}`,
    `pcap=${formatBytes(pcapSize)}`,
    `appLog=${formatBytes(appLogSize)}`,
  ].join(' ')
}

async function getFileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size
  }
  catch {
    return 0
  }
}

async function countFiles(dir: string): Promise<number> {
  try {
    return (await readdir(dir)).length
  }
  catch {
    return 0
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`

  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`

  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
