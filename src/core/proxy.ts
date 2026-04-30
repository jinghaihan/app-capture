import type { NetworkProxyState, ProxyKind, ProxySettings } from '../types'
import { x } from 'tinyexec'

const PROXY_COMMANDS: Record<ProxyKind, {
  get: string
  set: string
  setState: string
}> = {
  http: {
    get: '-getwebproxy',
    set: '-setwebproxy',
    setState: '-setwebproxystate',
  },
  https: {
    get: '-getsecurewebproxy',
    set: '-setsecurewebproxy',
    setState: '-setsecurewebproxystate',
  },
  socks: {
    get: '-getsocksfirewallproxy',
    set: '-setsocksfirewallproxy',
    setState: '-setsocksfirewallproxystate',
  },
}

export async function readNetworkProxyState(networkService: string): Promise<NetworkProxyState> {
  const [http, https, socks] = await Promise.all([
    readProxySettings('http', networkService),
    readProxySettings('https', networkService),
    readProxySettings('socks', networkService),
  ])

  return { http, https, socks }
}

export async function enableSystemProxy(networkService: string, host: string, port: number): Promise<void> {
  await setProxyEndpoint('http', networkService, host, port)
  await setProxyEndpoint('https', networkService, host, port)
}

export async function restoreSystemProxy(networkService: string, state: NetworkProxyState): Promise<void> {
  await restoreProxySettings('http', networkService, state.http)
  await restoreProxySettings('https', networkService, state.https)
  await restoreProxySettings('socks', networkService, state.socks)
}

async function readProxySettings(kind: ProxyKind, networkService: string): Promise<ProxySettings> {
  const result = await runNetworksetup([
    PROXY_COMMANDS[kind].get,
    networkService,
  ])

  return parseProxySettings(result)
}

async function setProxyEndpoint(kind: ProxyKind, networkService: string, host: string, port: number): Promise<void> {
  await runNetworksetup([
    PROXY_COMMANDS[kind].set,
    networkService,
    host,
    String(port),
  ])
  await setProxyState(kind, networkService, true)
}

async function restoreProxySettings(kind: ProxyKind, networkService: string, settings: ProxySettings): Promise<void> {
  if (settings.server && settings.port) {
    await runNetworksetup([
      PROXY_COMMANDS[kind].set,
      networkService,
      settings.server,
      String(settings.port),
    ])
  }

  await setProxyState(kind, networkService, settings.enabled)
}

async function setProxyState(kind: ProxyKind, networkService: string, enabled: boolean): Promise<void> {
  await runNetworksetup([
    PROXY_COMMANDS[kind].setState,
    networkService,
    enabled ? 'on' : 'off',
  ])
}

async function runNetworksetup(args: string[]): Promise<string> {
  const result = await x('networksetup', args, {
    throwOnError: true,
  })

  return result.stdout
}

export function parseProxySettings(output: string): ProxySettings {
  const values = new Map<string, string>()

  for (const line of output.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex >= 0) {
      const key = line.slice(0, separatorIndex).trim().toLowerCase()
      const value = line.slice(separatorIndex + 1).trim()

      values.set(key, value)
    }
  }

  const server = values.get('server') || undefined
  const port = Number(values.get('port'))

  return {
    enabled: parseNetworksetupBoolean(values.get('enabled')),
    server,
    port: Number.isFinite(port) && port > 0 ? port : undefined,
    authenticated: parseNetworksetupBoolean(values.get('authenticated proxy enabled')),
  }
}

function parseNetworksetupBoolean(value: string | undefined): boolean {
  if (!value)
    return false

  return ['1', 'enabled', 'on', 'true', 'yes'].includes(value.trim().toLowerCase())
}
