import type { Options } from './types'
import process from 'node:process'
import pkg from '../package.json'

export const NAME = pkg.name

export const VERSION = pkg.version

export const MANIFEST_FILENAME = 'manifest.json'

export const CAPTURE_LOG_FILENAME = 'capture.log'

export const HTTP_LOG_FILENAME = 'http.jsonl'

export const WEBSOCKET_LOG_FILENAME = 'websocket.jsonl'

export const BODIES_DIRNAME = 'bodies'

export const MITM_ADDON_FILENAME = 'mitm_addon.py'

export const MITM_CONFIG_FILENAME = 'mitm_config.json'

export const NETWORK_PCAP_FILENAME = 'network.pcap'

export const APP_LOG_FILENAME = 'app.log'

export const SCREENSHOTS_DIRNAME = 'screenshots'

export const PROXY_CONNECT_TIMEOUT = 1000

export const CAPTURE_PROGRESS_INTERVAL = 5000

export const TCPDUMP_DEFAULT_FILTER = '((udp and not port 5353 and not port 1900) or tcp port 443)'

export const DEFAULT_OPTIONS: Options = {
  cwd: process.cwd(),
  name: 'app-capture',
  processNames: [],
  hosts: [],
  paths: [],
  outDir: 'logs',
  networkService: 'Wi-Fi',
  proxyHost: '127.0.0.1',
  proxyPort: 8081,
  autoPickProxyPort: true,
  killProxyPort: false,
  systemProxy: true,
  restoreProxy: true,
  mitmBin: 'mitmdump',
  tcpdump: true,
  tcpdumpBin: 'tcpdump',
  tcpdumpFilter: TCPDUMP_DEFAULT_FILTER,
  systemLogs: true,
  logStyle: 'compact',
  screenshots: false,
  screenshotInterval: 5000,
}
