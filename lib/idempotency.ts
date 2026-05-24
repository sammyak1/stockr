import { prisma } from "./db";

/**
 * Checks for an existing idempotency record.
 * If found, returns the cached response.
 * If not, runs the handler and caches the result.
 */
export async function withIdempotency<T>(
  key: string | null | undefined,
  handler: () => Promise<{ status: number; body: T }>
): Promise<{ status: number; body: T; cached: boolean }> {
  if (!key) {
    const result = await handler();
    return { ...result, cached: false };
  }

  // Check for existing record
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key },
  });

  if (existing) {
    return {
      status: existing.statusCode,
      body: existing.body as T,
      cached: true,
    };
  }

  // Run the handler
  const result = await handler();

  // Store the result (best-effort — don't fail the request if this fails)
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key,
        statusCode: result.status,
        body: result.body as object,
      },
    });
  } catch (e) {
    // Unique constraint violation = concurrent request with same key, ignore
    console.warn("Idempotency record conflict:", e);
  }

  return { ...result, cached: false };
}
