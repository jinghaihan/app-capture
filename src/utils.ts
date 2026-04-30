import type { WriteStream } from 'node:fs'

export function escapePredicateString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function closeStream(stream: WriteStream): Promise<void> {
  return new Promise(resolve => stream.end(resolve))
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
