import * as openpgp from 'openpgp';
import { generatePGPKeys, generateSalt, hashPassword } from './pgp';
import { encryptWithTimelock, decryptWithTimelock } from './timelock';
import { EncryptionConfig, EncryptedData } from '../types';

export async function hybridEncrypt(
  data: string, 
  config: EncryptionConfig
): Promise<EncryptedData> {
  // const salt = generateSalt();
  // const passwordHash = hashPassword(config.password);
  
  // Generate PGP keys
  const { privateKey, publicKey } = await generatePGPKeys(config.password);
  
  // Encrypt data with public key
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: data }),
    encryptionKeys: await openpgp.readKey({ armoredKey: publicKey })
  });
  
  // Calculate unlock time
  const durationMs = 
    config.duration === 'min' ? 60 * 1000 :
    config.duration === 'month' ? 30 * 24 * 60 * 60 * 1000 :
    365 * 24 * 60 * 60 * 1000;
  const unlockTime = new Date(Date.now() + durationMs);
  
  // Time-lock the private key
  const privateKeyBytes = new TextEncoder().encode(privateKey);
  const { encrypted: timelockedKey, roundNumber } = await encryptWithTimelock(
    privateKeyBytes, 
    unlockTime
  );
  
  return {
    publicKey,
    encryptedData: encrypted,
    timelockedPrivateKey: timelockedKey,
    // salt,
    unlockTime,
    roundNumber
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