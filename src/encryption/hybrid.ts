import * as openpgp from 'openpgp';
import { generatePGPKeys } from './pgp';
import { encryptWithTimelock, decryptWithTimelock } from './timelock';
import {
  Duration,
  EncryptionConfig,
  EncryptionConfigWithCustomDuration,
  EncryptedData,
} from '../types';

const DURATION_MS: Record<Duration, number> = {
  min: 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

function isCustomDurationConfig(
  config: EncryptionConfig | EncryptionConfigWithCustomDuration
): config is EncryptionConfigWithCustomDuration {
  return 'durationMs' in config;
}

function getDurationMs(config: EncryptionConfig | EncryptionConfigWithCustomDuration): number {
  if (isCustomDurationConfig(config)) {
    return config.durationMs;
  }
  return DURATION_MS[config.duration];
}

export async function hybridEncrypt(
  data: string,
  config: EncryptionConfig | EncryptionConfigWithCustomDuration
): Promise<EncryptedData> {
  const { privateKey, publicKey } = await generatePGPKeys(config.password);

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: data }),
    encryptionKeys: await openpgp.readKey({ armoredKey: publicKey }),
  });

  const durationMs = getDurationMs(config);
  const unlockTime = new Date(Date.now() + durationMs);

  const privateKeyBytes = new TextEncoder().encode(privateKey);
  const { encrypted: timelockedKey, roundNumber } = await encryptWithTimelock(
    privateKeyBytes,
    unlockTime
  );

  return {
    publicKey,
    encryptedData: encrypted,
    timelockedPrivateKey: timelockedKey,
    unlockTime,
    roundNumber,
  };
}

export async function hybridDecrypt(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  // Decrypt time-locked private key
  const privateKeyBytes = await decryptWithTimelock(encryptedData.timelockedPrivateKey);
  const privateKey = new TextDecoder().decode(privateKeyBytes);
  
  // Decrypt the data
  const message = await openpgp.readMessage({
    armoredMessage: encryptedData.encryptedData
  });
  
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }),
      passphrase: password
    })
  });
  
  return decrypted;
}