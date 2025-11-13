import * as openpgp from 'openpgp';
import { createHash, randomBytes, scryptSync } from 'crypto';

export async function generatePGPKeys(password: string) {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 2048,
    userIDs: [{ name: 'User', email: 'user@example.com' }],
    passphrase: password
  });

  return { privateKey, publicKey };
}

export function deriveMasterKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}