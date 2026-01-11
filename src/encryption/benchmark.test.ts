/**
 * Benchmark Test Suite for HTLE Framework
 *
 * Collects performance metrics for the paper's Security Analysis section:
 * - Encryption time (key generation + data encryption + time-lock)
 * - Decryption time (time-lock unlock + password unlock + data decryption)
 * - Ciphertext size overhead
 *
 * These metrics support Section IV.4 (Experimental Validation) of the paper.
 */

import { describe, it, expect } from 'vitest';
import { hybridEncrypt, hybridDecrypt } from './hybrid';
import {
  TEST_PASSWORD,
  SHORT_DURATION_MS,
  UNLOCK_BUFFER_MS,
  wait,
  getRemainingTime,
  measureTime,
  TimingResult,
} from '../test-utils';

interface BenchmarkResult {
  testName: string;
  plaintextSize: number;
  ciphertextSize: number;
  timelockedKeySize: number;
  encryptionTimeMs: number;
  decryptionTimeMs: number;
  overheadRatio: number;
}

const benchmarkResults: BenchmarkResult[] = [];

describe('HTLE Performance Benchmarks', () => {
  const testSizes = [
    { name: 'Small (100B)', size: 100 },
    { name: 'Medium (1KB)', size: 1024 },
    { name: 'Large (10KB)', size: 10240 },
    { name: 'XLarge (100KB)', size: 102400 },
  ];

  describe('Encryption/Decryption Performance', () => {
    it.each(testSizes)(
      'should benchmark $name payload',
      async ({ name, size }) => {
        const plaintext = 'A'.repeat(size);

        // Measure encryption
        const { result: encrypted, timing: encryptTiming } = await measureTime(
          'encryption',
          () =>
            hybridEncrypt(plaintext, {
              password: TEST_PASSWORD,
              durationMs: SHORT_DURATION_MS,
            })
        );

        // Wait for unlock
        const remainingTime = getRemainingTime(encrypted.unlockTime);
        await wait(remainingTime + UNLOCK_BUFFER_MS);

        // Measure decryption
        const { result: decrypted, timing: decryptTiming } = await measureTime(
          'decryption',
          () => hybridDecrypt(encrypted, TEST_PASSWORD)
        );

        expect(decrypted).toBe(plaintext);

        // Calculate sizes
        const ciphertextSize = encrypted.encryptedData.length;
        const timelockedKeySize = encrypted.timelockedPrivateKey.length;
        const overheadRatio = (ciphertextSize + timelockedKeySize) / size;

        const result: BenchmarkResult = {
          testName: name,
          plaintextSize: size,
          ciphertextSize,
          timelockedKeySize,
          encryptionTimeMs: encryptTiming.durationMs,
          decryptionTimeMs: decryptTiming.durationMs,
          overheadRatio,
        };

        benchmarkResults.push(result);

        console.log(`\n--- ${name} ---`);
        console.log(`Plaintext size: ${size} bytes`);
        console.log(`Ciphertext size: ${ciphertextSize} bytes`);
        console.log(`Time-locked key size: ${timelockedKeySize} bytes`);
        console.log(`Total overhead ratio: ${overheadRatio.toFixed(2)}x`);
        console.log(`Encryption time: ${encryptTiming.durationMs.toFixed(2)}ms`);
        console.log(`Decryption time: ${decryptTiming.durationMs.toFixed(2)}ms`);
      }
    );
  });

  describe('Key Generation Overhead', () => {
    it('should measure PGP key generation time', async () => {
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { timing } = await measureTime('key-generation', () =>
          hybridEncrypt('test', {
            password: TEST_PASSWORD,
            durationMs: SHORT_DURATION_MS,
          })
        );
        times.push(timing.durationMs);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n--- Key Generation (${iterations} iterations) ---`);
      console.log(`Average: ${avgTime.toFixed(2)}ms`);
      console.log(`Min: ${minTime.toFixed(2)}ms`);
      console.log(`Max: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Time-Lock Precision', () => {
    it('should measure time between unlock time and actual decryption availability', async () => {
      const encrypted = await hybridEncrypt('test', {
        password: TEST_PASSWORD,
        durationMs: SHORT_DURATION_MS,
      });

      const targetUnlockTime = encrypted.unlockTime.getTime();

      // Wait until just after unlock time
      const remainingTime = getRemainingTime(encrypted.unlockTime);
      await wait(remainingTime);

      // Measure how long until decryption actually succeeds
      const startPolling = Date.now();
      let decryptionSucceeded = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!decryptionSucceeded && attempts < maxAttempts) {
        try {
          await hybridDecrypt(encrypted, TEST_PASSWORD);
          decryptionSucceeded = true;
        } catch {
          attempts++;
          await wait(500); // Poll every 500ms
        }
      }

      const actualDecryptTime = Date.now();
      const deviation = actualDecryptTime - targetUnlockTime;

      console.log(`\n--- Time-Lock Precision ---`);
      console.log(`Target unlock time: ${new Date(targetUnlockTime).toISOString()}`);
      console.log(`Actual decrypt time: ${new Date(actualDecryptTime).toISOString()}`);
      console.log(`Deviation: ${deviation}ms (${(deviation / 1000).toFixed(2)}s)`);
      console.log(`Polling attempts: ${attempts}`);

      expect(decryptionSucceeded).toBe(true);
      // Deviation should be within reasonable bounds (beacon period + network latency)
      expect(deviation).toBeLessThan(10_000); // 10 seconds max deviation
    });
  });

  describe('Summary Report', () => {
    it('should generate benchmark summary', () => {
      if (benchmarkResults.length === 0) {
        console.log('No benchmark results collected yet.');
        return;
      }

      console.log('\n========================================');
      console.log('HTLE BENCHMARK SUMMARY');
      console.log('========================================');
      console.log(
        '| Test Name | Plaintext | Ciphertext | Overhead | Encrypt | Decrypt |'
      );
      console.log(
        '|-----------|-----------|------------|----------|---------|---------|'
      );

      for (const r of benchmarkResults) {
        console.log(
          `| ${r.testName.padEnd(9)} | ${String(r.plaintextSize).padStart(9)} | ${String(r.ciphertextSize).padStart(10)} | ${r.overheadRatio.toFixed(2).padStart(8)}x | ${r.encryptionTimeMs.toFixed(0).padStart(6)}ms | ${r.decryptionTimeMs.toFixed(0).padStart(6)}ms |`
        );
      }

      console.log('========================================\n');
    });
  });
});
