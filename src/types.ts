export interface EncryptionConfig {
  password: string;
  duration: 'min' | 'month' | 'year';
}

export interface EncryptedData {
  publicKey: string;
  encryptedData: string;
  timelockedPrivateKey: string;
  unlockTime: Date;
  roundNumber: number;
}