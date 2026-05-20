/**
 * Next.js instrumentation — bootstrap local storage on server start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureStorageRoot } = await import("@/lib/storage");
    ensureStorageRoot();
  }
}
