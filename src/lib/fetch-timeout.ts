/**
 * fetchWithTimeout — PART 2 / P0 hardening.
 * Wraps fetch with AbortSignal.timeout so hung admin APIs surface a real
 * error instead of an infinite spinner ("Failed to fetch" class of bugs).
 * Additive helper only — no existing behavior changed.
 */

const DEFAULT_TIMEOUT_MS = 15000;

export function timeoutSignal(ms: number = DEFAULT_TIMEOUT_MS): AbortSignal {
  // Combine caller signal with timeout when provided via options below.
  return AbortSignal.timeout(ms);
}

export function mergeSignal(callerSignal: AbortSignal | undefined, ms: number = DEFAULT_TIMEOUT_MS): AbortSignal {
  if (!callerSignal) return AbortSignal.timeout(ms);
  // Abort if either the caller aborts or the timeout fires.
  const ctrl = new AbortController();
  if (callerSignal.aborted) ctrl.abort(callerSignal.reason);
  else callerSignal.addEventListener("abort", () => ctrl.abort(callerSignal.reason), { once: true });
  const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "TimeoutError")), ms);
  // Avoid keeping the process alive in non-DOM runtimes that support unref.
  const t = timer as unknown as { unref?: () => void };
  if (typeof t.unref === "function") t.unref();
  return ctrl.signal;
}

/**
 * Drop-in replacement for `new AbortController()` in admin loaders:
 * the returned controller auto-aborts after `ms` so hung APIs surface
 * a real error instead of an infinite spinner. All existing
 * `controller.signal` usages keep working unchanged.
 */
export function timedController(ms: number = DEFAULT_TIMEOUT_MS): AbortController {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort(new DOMException("Timeout", "TimeoutError"));
    } catch {
      /* noop */
    }
  }, ms);
  const t = timer as unknown as { unref?: () => void };
  if (typeof t.unref === "function") t.unref();
  return controller;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs, signal, ...rest } = init;
  const res = await fetch(input, { ...rest, signal: mergeSignal(signal ?? undefined, timeoutMs ?? DEFAULT_TIMEOUT_MS) });
  return res;
}

export async function fetchJsonWithTimeout<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetchWithTimeout(input, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
