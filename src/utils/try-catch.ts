type Success<T> = { success: true; result: T };
type Failure = { success: false; error: string };

export type TryCatchResult<T> = Success<T> | Failure;

export async function tryCatch<T>(fn: () => Promise<T>): Promise<TryCatchResult<T>> {
  try {
    const result = await fn();
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
