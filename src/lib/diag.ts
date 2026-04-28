"use client"

// Lightweight diagnostic event logger. Keeps a ring buffer of timestamped
// events in memory (and mirrored to console in dev). The /debug page
// subscribes to the CustomEvent stream and renders the buffer live.
//
// Purpose: make auth/fetch hangs observable. If a hook logs fetch_start
// without a matching fetch_ok/fetch_fail, we know exactly where it got stuck.

type DiagLevel = "info" | "warn" | "error"

export type DiagEvent = {
  t: number              // unix ms
  level: DiagLevel
  channel: string        // "auth", "hook:useClients", "proxy", etc.
  event: string          // "get_session_start", "fetch_ok", ...
  data?: Record<string, unknown>
}

const MAX_EVENTS = 500
const buffer: DiagEvent[] = []

const EVENT_NAME = "glowmetrics:diag"

function emit(ev: DiagEvent) {
  buffer.push(ev)
  if (buffer.length > MAX_EVENTS) buffer.shift()

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ev }))
  }

  const prefix = `[diag ${ev.channel}] ${ev.event}`
  if (ev.level === "error") console.error(prefix, ev.data ?? "")
  else if (ev.level === "warn") console.warn(prefix, ev.data ?? "")
  else if (typeof window !== "undefined") console.debug(prefix, ev.data ?? "")
}

export const diag = {
  log(channel: string, event: string, data?: Record<string, unknown>) {
    emit({ t: Date.now(), level: "info", channel, event, data })
  },
  warn(channel: string, event: string, data?: Record<string, unknown>) {
    emit({ t: Date.now(), level: "warn", channel, event, data })
  },
  error(channel: string, event: string, data?: Record<string, unknown>) {
    emit({ t: Date.now(), level: "error", channel, event, data })
  },
  dump(): DiagEvent[] {
    return buffer.slice()
  },
  clear() {
    buffer.length = 0
  },
  subscribe(cb: (ev: DiagEvent) => void): () => void {
    if (typeof window === "undefined") return () => {}
    const handler = (e: Event) => cb((e as CustomEvent<DiagEvent>).detail)
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  },
}

// Expose on window for manual debugging from DevTools console.
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__diag = diag
}

// Wrap a promise with a wall-clock timeout. Resolves with { ok: true, value }
// or { ok: false, reason: "timeout" | "error", error }. Never throws.
export async function withDiagTimeout<T>(
  channel: string,
  event: string,
  promise: PromiseLike<T>,
  timeoutMs: number,
): Promise<{ ok: true; value: T } | { ok: false; reason: "timeout" | "error"; error: unknown }> {
  const start = Date.now()
  diag.log(channel, `${event}_start`, { timeoutMs })
  try {
    const value = await Promise.race<T | typeof TIMEOUT_SENTINEL>([
      Promise.resolve(promise),
      new Promise<typeof TIMEOUT_SENTINEL>((resolve) =>
        setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs),
      ),
    ])
    if (value === TIMEOUT_SENTINEL) {
      diag.error(channel, `${event}_timeout`, { afterMs: Date.now() - start })
      return { ok: false, reason: "timeout", error: new Error(`timeout after ${timeoutMs}ms`) }
    }
    diag.log(channel, `${event}_ok`, { ms: Date.now() - start })
    return { ok: true, value: value as T }
  } catch (error) {
    diag.error(channel, `${event}_fail`, { ms: Date.now() - start, error: String(error) })
    return { ok: false, reason: "error", error }
  }
}

const TIMEOUT_SENTINEL = Symbol("diag-timeout")
