export type Duration = 'min' | 'month' | 'year';

export interface EncryptionConfig {
  password: string;
  duration: Duration;
}

export interface EncryptionConfigWithCustomDuration {
  password: string;
  durationMs: number;
}

export interface EncryptedData {
  publicKey: string;
  encryptedData: string;
  timelockedPrivateKey: string;
  unlockTime: Date;
  roundNumber: number;
}