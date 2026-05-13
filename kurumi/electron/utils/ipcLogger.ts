/**
 * Centralized logging for main-process IPC handlers (Electron console / OS logs).
 */

function formatUnknown(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack }
  }
  return { message: String(err) }
}

export function logIpcError(
  channel: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  const { message, stack } = formatUnknown(err)
  const payload = {
    channel,
    message,
    stack,
    ...context,
    t: new Date().toISOString(),
  }
  console.error('[kurumi-ipc]', JSON.stringify(payload))
  if (stack && process.env.NODE_ENV !== 'production') {
    console.error(stack)
  }
}
