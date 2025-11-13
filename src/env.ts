import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();


const envSchema = z.object({
	DRAND_CHAIN_URL: z.url(),
	DRAND_CHAIN_HASH: z.string().length(64),
	DRAND_PUBLIC_KEY: z.string().min(128),
});


export const env = envSchema.parse(process.env);