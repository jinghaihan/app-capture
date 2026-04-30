import type { Options } from '../types'
import net from 'node:net'
import getPort from 'get-port'
import killPort from 'kill-port'
import { x } from 'tinyexec'
import { PROXY_CONNECT_TIMEOUT } from '../constants'
import { sleep } from '../utils'

export async function resolveProxyPort(options: Options): Promise<number> {
  if (options.killProxyPort) {
    await killPort(options.proxyPort, 'tcp').catch(() => {})
    await sleep(500)
  }

  const port = await getPort({
    host: options.proxyHost,
    port: options.proxyPort,
  })

  if (port === options.proxyPort || options.autoPickProxyPort)
    return port

  throw new Error(`Proxy port ${options.proxyPort} is already in use. Pass --auto-pick-proxy-port or --kill-proxy-port.`)
}

export async function detectDefaultInterface(): Promise<string | undefined> {
  const result = await x('route', ['get', 'default']).then(result => result, () => undefined)
  const match = result?.stdout.match(/interface:\s*(\S+)/)

  return match?.[1]
}

export async function waitForPort(host: string, port: number, timeout: number): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    if (await canConnect(host, port, PROXY_CONNECT_TIMEOUT))
      return

    await sleep(100)
  }

  throw new Error(`Timed out waiting for local proxy at ${host}:${port}.`)
}

function canConnect(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolveReady) => {
    const socket = net.createConnection({ host, port })
    let settled = false

    const settle = (ready: boolean) => {
      if (settled)
        return

      settled = true
      socket.destroy()
      resolveReady(ready)
    }

    socket.setTimeout(timeout)
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
    socket.once('timeout', () => settle(false))
  })
}
