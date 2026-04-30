/**
 * Supported output styles for macOS `log stream`.
 */
export type LogStyle = 'compact' | 'json' | 'ndjson' | 'syslog'

/**
 * Runtime status for a capture run.
 */
export type CaptureStatus = 'running' | 'stopped' | 'failed'

/**
 * macOS proxy kinds managed by `networksetup`.
 */
export type ProxyKind = 'http' | 'https' | 'socks'

/**
 * User-facing options accepted by the CLI and config file.
 */
export interface CommandOptions {
  /**
   * Working directory used for config lookup and resolving relative output paths.
   *
   * @default process.cwd()
   */
  cwd?: string

  /**
   * Human-readable capture name used in output folder names.
   * This is not the application process name.
   *
   * @default "app-capture"
   */
  name?: string

  /**
   * macOS process names used to filter `log stream` output.
   * This does not restrict HTTP/WebSocket traffic captured by the system proxy.
   *
   * @default []
   */
  processNames?: string | string[]

  /**
   * Custom macOS `log stream` predicate.
   * When set, this takes precedence over the predicate generated from `processNames`.
   *
   * @default undefined
   */
  processPredicate?: string

  /**
   * Hostname filters for HTTP and WebSocket flows, such as `example.test`.
   * If both `hosts` and `paths` are empty, no URL filtering is applied.
   *
   * @default []
   */
  hosts?: string | string[]

  /**
   * URL path substring filters for HTTP and WebSocket flows, such as `/api/items`.
   * If both `hosts` and `paths` are empty, no URL filtering is applied.
   *
   * @default []
   */
  paths?: string | string[]

  /**
   * Directory where capture runs are written.
   *
   * @default "logs"
   */
  outDir?: string

  /**
   * macOS network service whose proxy settings should be changed, for example `Wi-Fi`.
   *
   * @default "Wi-Fi"
   */
  networkService?: string

  /**
   * Hostname or IP address where the local mitmproxy-compatible proxy listens.
   *
   * @default "127.0.0.1"
   */
  proxyHost?: string

  /**
   * Preferred local proxy port.
   * The CLI may choose another free port when automatic port selection is enabled.
   *
   * @default 8081
   */
  proxyPort?: number

  /**
   * Whether to automatically choose a free proxy port when `proxyPort` is unavailable.
   *
   * @default true
   */
  autoPickProxyPort?: boolean

  /**
   * Whether to stop an existing process that is already listening on `proxyPort`.
   *
   * @default false
   */
  killProxyPort?: boolean

  /**
   * Whether to configure the macOS system HTTP/HTTPS proxy for `networkService`.
   *
   * @default true
   */
  systemProxy?: boolean

  /**
   * Whether to restore the original macOS proxy settings when capture stops.
   *
   * @default true
   */
  restoreProxy?: boolean

  /**
   * Optional upstream proxy URL passed to the local proxy.
   *
   * @default undefined
   */
  upstreamProxy?: string

  /**
   * Executable name or path for the mitmproxy command used to record HTTP/WebSocket flows.
   *
   * @default "mitmdump"
   */
  mitmBin?: string

  /**
   * Whether to record packet-level traffic with `tcpdump`.
   *
   * @default true
   */
  tcpdump?: boolean

  /**
   * Executable name or path for `tcpdump`.
   *
   * @default "tcpdump"
   */
  tcpdumpBin?: string

  /**
   * Network interface passed to `tcpdump`, such as `en0`.
   * When omitted, the CLI should infer the default interface.
   *
   * @default undefined
   */
  tcpdumpInterface?: string

  /**
   * Optional BPF filter passed to `tcpdump`.
   *
   * @default "((udp and not port 5353 and not port 1900) or tcp port 443)"
   */
  tcpdumpFilter?: string

  /**
   * Whether to record macOS unified logs with `log stream`.
   *
   * @default true
   */
  systemLogs?: boolean

  /**
   * Output style passed to `log stream`.
   *
   * @default "compact"
   */
  logStyle?: LogStyle

  /**
   * Whether to periodically capture screenshots during the run.
   *
   * @default false
   */
  screenshots?: boolean

  /**
   * Interval between screenshots in milliseconds.
   *
   * @default 5000
   */
  screenshotInterval?: number
}

/**
 * Options accepted by `app-capture.config.ts`.
 */
export interface ConfigOptions extends CommandOptions {}

/**
 * Fully resolved runtime options after defaults and config values are merged.
 */
export interface Options extends Omit<Required<CommandOptions>, 'processNames' | 'hosts' | 'paths' | 'processPredicate' | 'upstreamProxy' | 'tcpdumpInterface' | 'tcpdumpFilter'> {
  /**
   * Normalized process names.
   */
  processNames: string[]

  /**
   * Normalized host filters.
   */
  hosts: string[]

  /**
   * Normalized path filters.
   */
  paths: string[]

  /**
   * Resolved custom macOS log predicate, if provided.
   */
  processPredicate?: string

  /**
   * Resolved upstream proxy URL, if provided.
   */
  upstreamProxy?: string

  /**
   * Resolved tcpdump network interface, if provided.
   */
  tcpdumpInterface?: string

  /**
   * Resolved tcpdump BPF filter, if provided.
   */
  tcpdumpFilter?: string
}

/**
 * A single proxy state read from macOS network settings.
 */
export interface ProxySettings {
  enabled: boolean
  server?: string
  port?: number
  authenticated: boolean
}

/**
 * Original proxy settings for a macOS network service.
 */
export type NetworkProxyState = Record<ProxyKind, ProxySettings>

/**
 * Output paths for one capture run.
 */
export interface CaptureOutputPaths {
  captureLog: string
  httpLog: string
  websocketLog: string
  bodiesDir: string
  mitmAddon: string
  mitmConfig: string
  networkPcap: string
  appLog: string
  screenshotsDir: string
}

/**
 * Metadata written to `manifest.json` for each capture run.
 */
export interface CaptureManifest {
  runId: string
  name: string
  runDir: string
  startedAt: string
  endedAt?: string
  status: CaptureStatus
  stopReason?: string
  options: Options
  outputs: CaptureOutputPaths
  proxy?: {
    original?: NetworkProxyState
    applied?: {
      networkService: string
      host: string
      port: number
    }
  }
}

/**
 * Summary returned when a capture run exits.
 */
export interface CaptureResult {
  runId: string
  runDir: string
  manifestPath: string
  status: CaptureStatus
}
