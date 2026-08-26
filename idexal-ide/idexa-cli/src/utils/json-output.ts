/**
 * JSON Output Adapter
 *
 * When --json is passed globally, all commands emit a single JSON blob to
 * stdout instead of human-readable output.  Tests validate against the
 * { ok, command, data, error? } envelope.
 */

export interface JsonEnvelope<T = unknown> {
  ok: boolean
  command: string
  data: T
  error?: string
}

let _jsonMode = false
let _currentCommand = ''

export function setJsonMode(enabled: boolean, command = '') {
  _jsonMode = enabled
  _currentCommand = command
}

export function isJsonMode(): boolean {
  return _jsonMode
}

/**
 * Emit a JSON envelope and exit.
 * All command handlers should call `jsonSuccess` / `jsonFail` instead of
 * `console.log` when --json is active.
 */
export function jsonSuccess<T>(data: T): never {
  const envelope: JsonEnvelope<T> = { ok: true, command: _currentCommand, data }
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
  process.exit(0)
}

export function jsonFail(error: string, data: unknown = null): never {
  const envelope: JsonEnvelope = { ok: false, command: _currentCommand, data, error }
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
  process.exit(1)
}

/**
 * Intercept console.log / console.warn when --json is active.
 * Returns a restore function.
 */
export function captureConsole(): () => string {
  const chunks: string[] = []
  const origLog = console.log
  const origWarn = console.warn
  const origError = console.error

  console.log = (...args: any[]) => { if (!_jsonMode) origLog(...args); chunks.push(args.map(String).join(' ')) }
  console.warn = (...args: any[]) => { if (!_jsonMode) origWarn(...args); chunks.push(args.map(String).join(' ')) }
  console.error = (...args: any[]) => { if (!_jsonMode) origError(...args); chunks.push(args.map(String).join(' ')) }

  return () => {
    console.log = origLog
    console.warn = origWarn
    console.error = origError
    return chunks.join('\n')
  }
}
