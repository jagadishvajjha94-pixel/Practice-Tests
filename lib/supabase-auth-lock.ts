/**
 * No auth lock queue — avoids processLock / navigator.locks timeouts when many
 * components call getUser() on mount. Session refresh is handled server-side.
 */
export async function browserAuthLockNoOp<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return await fn()
}
