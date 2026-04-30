import type { CaptureManifest, CaptureOutputPaths } from '../types'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  APP_LOG_FILENAME,
  BODIES_DIRNAME,
  CAPTURE_LOG_FILENAME,
  HTTP_LOG_FILENAME,
  MITM_ADDON_FILENAME,
  MITM_CONFIG_FILENAME,
  NETWORK_PCAP_FILENAME,
  SCREENSHOTS_DIRNAME,
  WEBSOCKET_LOG_FILENAME,
} from '../constants'

export function createOutputPaths(runDir: string): CaptureOutputPaths {
  return {
    captureLog: resolve(runDir, CAPTURE_LOG_FILENAME),
    httpLog: resolve(runDir, HTTP_LOG_FILENAME),
    websocketLog: resolve(runDir, WEBSOCKET_LOG_FILENAME),
    bodiesDir: resolve(runDir, BODIES_DIRNAME),
    mitmAddon: resolve(runDir, MITM_ADDON_FILENAME),
    mitmConfig: resolve(runDir, MITM_CONFIG_FILENAME),
    networkPcap: resolve(runDir, NETWORK_PCAP_FILENAME),
    appLog: resolve(runDir, APP_LOG_FILENAME),
    screenshotsDir: resolve(runDir, SCREENSHOTS_DIRNAME),
  }
}

export async function writeManifest(manifestPath: string, manifest: CaptureManifest): Promise<void> {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

export function createRunId(name: string, startedAt: string): string {
  const safeName = sanitizePathSegment(name)
  const safeStartedAt = startedAt.replaceAll(/[:.]/g, '-')

  return `${safeName}-${safeStartedAt}`
}

function sanitizePathSegment(value: string): string {
  const segment = value
    .trim()
    .replaceAll(/[^\p{L}\p{N}._-]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '')

  return segment || 'capture'
}
