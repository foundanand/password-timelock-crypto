/**
 * Functional Test Suite for HTLE Framework
 *
 * These tests validate the correctness of the encryption/decryption workflow:
 * - TC4: Complete happy path (encrypt → wait → decrypt)
 * - TC6: End-to-end with various durations and data sizes
 *
 * Reference: Section III (System Architecture) of the HTLE paper
 */

import { describe, it, expect } from 'vitest';
import { hybridEncrypt, hybridDecrypt } from './hybrid';
import {
  TEST_PASSWORD,
  TEST_PLAINTEXT,
  SHORT_DURATION_MS,
  UNLOCK_BUFFER_MS,
  wait,
  getRemainingTime,
  measureTime,
  formatDuration,
} from '../test-utils';

describe('HTLE Functional Tests', () => {
  /**
   * TC4: Correct Flow (Happy Path)
   *
   * Validates: End-to-end encryption and decryption workflow
   * Expected: Original plaintext is recovered after both gates are unlocked
   *
   * Workflow:
   * 1. Encrypt data with password and time-lock
   * 2. Wait for drand round R to be available
   * 3. Decrypt with correct password
   * 4. Verify plaintext matches original
   */
  describe('TC4: Correct Flow (Happy Path)', () => {
    it('should successfully encrypt and decrypt after time-lock expires', async () => {
      // Step 1: Encrypt
      const { result: encrypted, timing: encryptTiming } = await measureTime(
        'encryption',
        () =>
          hybridEncrypt(TEST_PLAINTEXT, {
            password: TEST_PASSWORD,
            durationMs: SHORT_DURATION_MS,
          })
      );

      console.log(`Encryption completed in ${encryptTiming.durationMs.toFixed(2)}ms`);
      console.log(`Unlock time: ${encrypted.unlockTime.toISOString()}`);
      console.log(`drand round: ${encrypted.roundNumber}`);

      // Verify encryption output structure
      expect(encrypted.publicKey).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
      expect(encrypted.encryptedData).toContain('-----BEGIN PGP MESSAGE-----');
      expect(encrypted.timelockedPrivateKey).toBeTruthy();
      expect(encrypted.roundNumber).toBeGreaterThan(0);

      // Step 2: Wait for time-lock
      const remainingTime = getRemainingTime(encrypted.unlockTime);
      console.log(`Waiting ${formatDuration(remainingTime + UNLOCK_BUFFER_MS)} for time-lock...`);
      await wait(remainingTime + UNLOCK_BUFFER_MS);

      // Step 3: Decrypt
      const { result: decrypted, timing: decryptTiming } = await measureTime(
        'decryption',
        () => hybridDecrypt(encrypted, TEST_PASSWORD)
      );

      console.log(`Decryption completed in ${decryptTiming.durationMs.toFixed(2)}ms`);

      // Step 4: Verify
      expect(decrypted).toBe(TEST_PLAINTEXT);
    });
  });

  /**
   * TC6: End-to-End with Various Parameters
   *
   * Validates: System consistency across different configurations
   * Expected: All configurations produce valid encryption/decryption cycles
   */
  describe('TC6: End-to-End with Various Parameters', () => {
    const testCases = [
      {
        name: 'Short message',
        plaintext: 'Hello',
        durationMs: SHORT_DURATION_MS,
      },
      {
        name: 'Medium message',
        plaintext: TEST_PLAINTEXT,
        durationMs: SHORT_DURATION_MS,
      },
      {
        name: 'Long message',
        plaintext: TEST_PLAINTEXT.repeat(10),
        durationMs: SHORT_DURATION_MS,
      },
      {
        name: 'Message with special characters',
        plaintext: '🔐 Encrypted! <script>alert("xss")</script> & "quotes"',
        durationMs: SHORT_DURATION_MS,
      },
      {
        name: 'Unicode message',
        plaintext: '日本語テスト мир العربية',
        durationMs: SHORT_DURATION_MS,
      },
    ];

    it.each(testCases)(
      'should handle $name correctly',
      async ({ plaintext, durationMs }) => {
        const encrypted = await hybridEncrypt(plaintext, {
          password: TEST_PASSWORD,
          durationMs,
        });

        const remainingTime = getRemainingTime(encrypted.unlockTime);
        await wait(remainingTime + UNLOCK_BUFFER_MS);

        const decrypted = await hybridDecrypt(encrypted, TEST_PASSWORD);
        expect(decrypted).toBe(plaintext);
      }
    );

    it('should work with standard duration "min"', async () => {
      const encrypted = await hybridEncrypt(TEST_PLAINTEXT, {
        password: TEST_PASSWORD,
        duration: 'min',
      });

      // Verify round number corresponds to ~60 seconds in future
      expect(encrypted.roundNumber).toBeGreaterThan(0);

      // Just verify encryption works, don't wait the full minute
      expect(encrypted.encryptedData).toContain('-----BEGIN PGP MESSAGE-----');
    });
  });

  /**
   * Data Integrity Tests
   *
   * Validates: Encrypted data cannot be tampered with
   */
  describe('Data Integrity', () => {
    it('should detect tampering with encrypted data', async () => {
      const encrypted = await hybridEncrypt(TEST_PLAINTEXT, {
        password: TEST_PASSWORD,
        durationMs: SHORT_DURATION_MS,
      });

      const remainingTime = getRemainingTime(encrypted.unlockTime);
      await wait(remainingTime + UNLOCK_BUFFER_MS);

      // Tamper with the encrypted data
      const tampered = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.replace('A', 'B'),
      };

      await expect(hybridDecrypt(tampered, TEST_PASSWORD)).rejects.toThrow();
    });

    it('should detect tampering with time-locked key', async () => {
      const encrypted = await hybridEncrypt(TEST_PLAINTEXT, {
        password: TEST_PASSWORD,
        durationMs: SHORT_DURATION_MS,
      });

      const remainingTime = getRemainingTime(encrypted.unlockTime);
      await wait(remainingTime + UNLOCK_BUFFER_MS);

      // Tamper with the time-locked key
      const tampered = {
        ...encrypted,
        timelockedPrivateKey: encrypted.timelockedPrivateKey.slice(0, -10) + 'AAAAAAAAAA',
      };

      await expect(hybridDecrypt(tampered, TEST_PASSWORD)).rejects.toThrow();
    });
  });

  /**
   * Round Number Verification
   *
   * Validates: Round numbers are calculated correctly based on unlock time
   */
  describe('Round Number Calculation', () => {
    it('should calculate increasing round numbers for longer durations', async () => {
      const shortDuration = await hybridEncrypt(TEST_PLAINTEXT, {
        password: TEST_PASSWORD,
        durationMs: 10_000, // 10 seconds
      });

      const longerDuration = await hybridEncrypt(TEST_PLAINTEXT, {
        password: TEST_PASSWORD,
        durationMs: 30_000, // 30 seconds
      });

      expect(longerDuration.roundNumber).toBeGreaterThan(shortDuration.roundNumber);
    });
  });
});
