import type { Buffer } from 'node:buffer'
import type { WriteStream } from 'node:fs'
import process from 'node:process'
import c from 'ansis'
import tildify from 'tildify'

export interface CaptureLogger {
  info: (message: string) => void
  progress: (message: string) => void
  success: (message: string) => void
  warn: (message: string) => void
  path: (message: string, path: string) => void
  command: (command: string, args: string[]) => void
  child: (name: string, stream: 'stdout' | 'stderr', chunk: Buffer) => void
}

export function createCaptureLogger(captureLog: WriteStream): CaptureLogger {
  function write(message: string, pretty = message): void {
    captureLog.write(`[${new Date().toISOString()}] ${message}\n`)
    process.stdout.write(`${pretty}\n`)
  }

  return {
    info(message) {
      write(message, `${c.dim('›')} ${message}`)
    },
    progress(message) {
      write(message, `${c.cyan('•')} ${c.dim(message)}`)
    },
    success(message) {
      write(message, `${c.green('✓')} ${message}`)
    },
    warn(message) {
      write(message, `${c.yellow('!')} ${message}`)
    },
    path(message, path) {
      const prettyPath = tildify(path)

      write(`${message}: ${prettyPath}`, `${c.dim('›')} ${message}: ${c.cyan(prettyPath)}`)
    },
    command(command, args) {
      const text = `$ ${[command, ...args].map(quoteArg).join(' ')}`

      write(text, `${c.dim('$')} ${c.dim([command, ...args].map(quoteArg).join(' '))}`)
    },
    child(name, stream, chunk) {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) {
          captureLog.write(`[${new Date().toISOString()}] [${name}:${stream}] ${line}\n`)

          const pretty = formatChildLine(name, stream, line)

          if (pretty)
            process.stdout.write(`${pretty}\n`)
        }
      }
    },
  }
}

function formatChildLine(name: string, stream: 'stdout' | 'stderr', line: string): string | undefined {
  if (line.includes('[app-capture-http-error]'))
    return `${c.red('http')} ${c.dim(name)} ${line}`

  if (line.includes('[app-capture-http]'))
    return `${c.blue('http')} ${c.dim(name)} ${line}`

  if (line.includes('[app-capture-ws]'))
    return `${c.magenta('ws')} ${c.dim(name)} ${line}`

  if (/error|failed|warning|warn|listening on|packets captured|packets received by filter|packets dropped by kernel/i.test(line))
    return `${c.dim(`[${name}:${stream}]`)} ${line}`

  return undefined
}

function quoteArg(arg: string): string {
  return /^[\w./:=@-]+$/.test(arg) ? tildify(arg) : JSON.stringify(tildify(arg))
}
