// Resolves to null if `work` hasn't settled within `ms`. A plain timer rather
// than an AbortSignal: Next drops the fetch signal when it refreshes a stale
// cache entry (patch-fetch, still true in 16), so a signal can't bound ISR.
// The timer is always cleared, so a fast result never leaves one pending.
export async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, expired]);
  } finally {
    clearTimeout(timer);
  }
}
