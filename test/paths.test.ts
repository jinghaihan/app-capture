import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createOutputPaths, createRunId } from '../src/core/paths'

describe('createRunId', () => {
  it('creates stable filesystem-safe run ids', () => {
    expect(createRunId('Demo Capture 01', '2026-04-30T05:19:56.609Z')).toBe(
      'Demo-Capture-01-2026-04-30T05-19-56-609Z',
    )
  })
})

describe('createOutputPaths', () => {
  it('builds the expected capture file layout', () => {
    const runDir = resolve('/tmp/app-capture/run')
    const paths = createOutputPaths(runDir)

    expect(paths).toMatchObject({
      captureLog: resolve(runDir, 'capture.log'),
      httpLog: resolve(runDir, 'http.jsonl'),
      websocketLog: resolve(runDir, 'websocket.jsonl'),
      bodiesDir: resolve(runDir, 'bodies'),
      mitmAddon: resolve(runDir, 'mitm_addon.py'),
      mitmConfig: resolve(runDir, 'mitm_config.json'),
      networkPcap: resolve(runDir, 'network.pcap'),
      appLog: resolve(runDir, 'app.log'),
      screenshotsDir: resolve(runDir, 'screenshots'),
    })
  })
})
