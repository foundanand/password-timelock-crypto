/**
 * Test utilities for HTLE framework testing
 */

export const TEST_PASSWORD = 'test-secure-password-123';
export const WRONG_PASSWORD = 'wrong-password-456';
export const TEST_PLAINTEXT = 'This is a secret message for testing the HTLE framework.';

/** Short duration for tests: 10 seconds */
export const SHORT_DURATION_MS = 10_000;

/** Buffer time to add after expected unlock (accounts for network latency) */
export const UNLOCK_BUFFER_MS = 3_000;

/** drand beacon period in milliseconds */
export const DRAND_PERIOD_MS = 3_000;

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate remaining time until unlock
 */
export function getRemainingTime(unlockTime: Date): number {
  return Math.max(0, unlockTime.getTime() - Date.now());
}

/**
 * Format milliseconds as human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}

/**
 * Performance measurement result
 */
export interface TimingResult {
  operationName: string;
  durationMs: number;
  timestamp: Date;
}

/**
 * Measure execution time of an async operation
 */
export async function measureTime<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<{ result: T; timing: TimingResult }> {
  const start = performance.now();
  const result = await operation();
  const durationMs = performance.now() - start;

  return {
    result,
    timing: {
      operationName,
      durationMs,
      timestamp: new Date(),
    },
  };
}
