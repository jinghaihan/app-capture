import type { Result } from 'tinyexec'
import type { CaptureLogger } from './logger'

export interface CaptureChildProcess {
  name: string
  proc: Result
  stopSignal: NodeJS.Signals
}

export async function stopChild(child: CaptureChildProcess, logger: CaptureLogger): Promise<void> {
  logger.info(`Stopping ${child.name}`)
  child.proc.kill(child.stopSignal)
  await child.proc.then(() => {}, () => {})
}

export function attachChildOutput(name: string, proc: Result, logger: CaptureLogger): void {
  proc.process?.stdout?.on('data', chunk => logger.child(name, 'stdout', chunk))
  proc.process?.stderr?.on('data', chunk => logger.child(name, 'stderr', chunk))
}
