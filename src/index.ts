import { hybridEncrypt, hybridDecrypt } from './encryption/hybrid';

(async () => {
	const secret = "This is a top secret message that needs to be protected with time-lock encryption!";
	const enc = await hybridEncrypt(secret, { password: 'my-secure-password', duration: 'min' });

	console.log(`🔒 ${enc.encryptedData.slice(0, 100)}... ⏰ ${enc.unlockTime} 🔢 ${enc.roundNumber}`);

	// What happens if we try to decrypt immediately?
	try {
		const unlockTs = typeof enc.unlockTime === 'number' ? enc.unlockTime : Date.parse(String(enc.unlockTime));
		const remainingMs = Math.max(0, unlockTs - Date.now());
		const secs = Math.floor(remainingMs / 1000);
		console.log(`Time remaining before unlock: ${Math.floor(secs / 60)}m ${secs % 60}s (${remainingMs}ms)`);
		console.log('Attempting immediate decryption');
		console.log('🔓', await hybridDecrypt(enc, 'my-secure-password'));
	} catch (err) {
		console.error('Decryption failed as expected:', err instanceof Error ? err.message : String(err));
	}
	
	// wait 61 seconds before attempting to decrypt
	console.log('Waiting for time-lock to expire before decryption');
	await new Promise((resolve) => setTimeout(resolve, 61_000));
	console.log('🔓', await hybridDecrypt(enc, 'my-secure-password'));

})().catch(console.error);
