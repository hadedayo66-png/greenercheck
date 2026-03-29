/**
 * Next.js 15+ may pass `params` / `searchParams` as Promises; earlier versions pass
 * plain objects. `await` on a non-Promise value returns it unchanged.
 */
export async function fromNextParam<T>(input: T | Promise<T>): Promise<T> {
  return await input;
}
