import {
	timelockEncrypt,
	timelockDecrypt,
	roundAt,
	HttpChainClient,
	HttpCachingChain,
	ChainInfo,
	Buffer,
} from 'tlock-js';

import { env } from '../env';

export const CHAIN_INFO: ChainInfo = {
	public_key: env.DRAND_PUBLIC_KEY,
	period: 3,
	genesis_time: 1692803367,
	hash: env.DRAND_CHAIN_HASH,
	groupHash:
		'f477d5c89f21a17c863a7f937c6a6d15859414d2be09cd448d4279af331c5d3e',
	schemeID: 'bls-unchained-g1-rfc9380',
	metadata: { beaconID: 'quicknet' },
};

const CHAIN_OPTIONS = {
	disableBeaconVerification: false,
	noCache: false,
	chainVerificationParams: {
		chainHash: env.DRAND_CHAIN_HASH,
		publicKey: env.DRAND_PUBLIC_KEY,
	},
};

let cachedClient: HttpChainClient | null = null;

export function getChainClient(): HttpChainClient {
	if (cachedClient) return cachedClient;
	const chain = new HttpCachingChain(env.DRAND_CHAIN_URL, CHAIN_OPTIONS);
	cachedClient = new HttpChainClient(chain, CHAIN_OPTIONS);
	return cachedClient;
}

/**
 * Encrypt data so it can only be unlocked at/after unlockDate.
 * Uses a cached chain client and avoids unnecessary buffer copies.
 */
export async function encryptWithTimelock(
	data: Uint8Array,
	unlockDate: Date
): Promise<{ encrypted: string; roundNumber: number }> {
	if (!unlockDate || !(unlockDate instanceof Date) || isNaN(unlockDate.getTime())) {
		throw new TypeError('unlockDate must be a valid Date');
	}

	// roundAt expects a timestamp in milliseconds
	const timestampMilliseconds = unlockDate.getTime();
	const roundNumber = await roundAt(timestampMilliseconds, CHAIN_INFO);

	// create Buffer without an extra copy where possible
	const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
	const encrypted = await timelockEncrypt(roundNumber, buffer, getChainClient());

	return { encrypted, roundNumber };
}

/**
 * Decrypt previously timelocked data.
 */
export async function decryptWithTimelock(encrypted: string): Promise<Uint8Array> {
	const decrypted = await timelockDecrypt(encrypted, getChainClient());

	// Normalize to Uint8Array without unnecessary copying where possible
	if (decrypted instanceof Uint8Array) {
		return new Uint8Array(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength);
	}

	// If it's a Buffer-like object, convert reliably
	const buf = Buffer.from(decrypted as any);
	return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
