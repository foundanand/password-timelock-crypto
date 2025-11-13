# Password Timelock Crypto

A hybrid encryption system combining password-based encryption with time-lock cryptography using drand randomness beacons.

## Setup

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Generate the required drand network variables by visiting the [drand networks page](https://docs.drand.love/dev-guide/developer/http-api) and selecting a network.

```bash
# .env
DRAND_CHAIN_URL=
DRAND_CHAIN_HASH=
DRAND_PUBLIC_KEY=
```

## Usage

Build and run:

```bash
pnpm run dev
```

Or separately:

```bash
pnpm run build
pnpm start
```

## How It Works

Encrypts data with both a password and a time-lock. The encrypted data can only be decrypted after:
1. Providing the correct password
2. The time-lock period has elapsed (verified via drand beacon)
