# x402-fetch Example Client

This is an example client that demonstrates how to use the `x402-fetch` package to make HTTP requests to endpoints protected by the x402 payment protocol.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v10 (install via [pnpm.io/installation](https://pnpm.io/installation))
- A running x402 server (you can use the example express server at `examples/typescript/servers/express`)
- CDP API credentials (get from [CDP Portal](https://portal.cdp.coinbase.com/))

## Setup

1. Install and build all packages from the typescript examples root:

```bash
cd ../../
pnpm install
pnpm build
cd clients/fetch
```

2. Copy `.env-local` to `.env` and add your CDP API credentials:

```bash
cp .env-local .env
```

3. Update the `.env` file with your CDP credentials:

```
RESOURCE_SERVER_URL=http://localhost:4021
ENDPOINT_PATH=/weather

# CDP API credentials - Get these from https://portal.cdp.coinbase.com/
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
CDP_WALLET_SECRET=your_wallet_secret
```

4. Start the example client:

```bash
pnpm dev
```

## How It Works

The example demonstrates how to:

1. Initialize the CDP client with your API credentials
2. Create or retrieve a wallet account using the CDP SDK
3. Convert the CDP account to a viem-compatible format
4. Wrap the native fetch function with x402 payment handling
5. Make a request to a paid endpoint
6. Handle the response or any errors

## Example Code

```typescript
import { config } from "dotenv";
import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";

config();

const baseURL = process.env.RESOURCE_SERVER_URL as string;
const endpointPath = process.env.ENDPOINT_PATH as string;
const url = `${baseURL}${endpointPath}`;

// Initialize CDP client with API credentials
const cdp = new CdpClient();

async function main() {
  // Create or get an existing account using CDP SDK
  const account = await cdp.evm.getOrCreateAccount({ name: "x402-example-account" });
  console.log(`Using CDP account: ${account.address}`);

  // Convert CDP account to viem account format for x402-fetch
  const viemAccount = toAccount(account);

  const fetchWithPayment = wrapFetchWithPayment(fetch, viemAccount);

  const response = await fetchWithPayment(url, {
    method: "GET",
  });

  const body = await response.json();
  console.log(body);

  const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
  console.log(paymentResponse);
}

main().catch(console.error);
```

## CDP Wallet Management

With the CDP SDK, your private keys are securely managed by Coinbase in a Trusted Execution Environment (TEE). This means:

- No need to handle private keys yourself
- Enhanced security for your wallet management
- Simplified account creation and management
- Cross-chain support across EVM networks

The example creates a named account that can be reused across multiple runs. If you need to fund your account for testing, you can use the CDP faucet functionality:

```typescript
// Request testnet funds (if available)
const faucetTx = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});
```
