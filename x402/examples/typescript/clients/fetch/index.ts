import { config } from "dotenv";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";
import { readFileSync } from "fs";

config();

const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather
const url = `${baseURL}${endpointPath}`; // e.g. https://example.com/weather

const privateKey = process.env.PRIVATE_KEY as Hex;

if (!baseURL || !endpointPath || !privateKey) {
  console.error(
    "Missing required environment variables: RESOURCE_SERVER_URL, ENDPOINT_PATH, and PRIVATE_KEY",
  );
  process.exit(1);
}

// --- Original viem implementation ---
const account = privateKeyToAccount(privateKey);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

// Prepare multipart/form-data with the local PDF
const pdfPath = process.env.LOCAL_PDF_PATH ?? "./table.pdf";
const pdfBuffer = readFileSync(pdfPath);

const formData = new FormData();
formData.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "table.pdf");

fetchWithPayment(url, {
  method: "POST",
  body: formData as any,
})
  .then(async response => {
    const body = await response.json();
    console.log(body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log(paymentResponse);
  })
  .catch(error => {
    console.error(error);
  });

// --- CDP-based implementation (currently disabled) ---
/*
// Initialize CDP client with API credentials
// Requires CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET environment variables
const cdp = new CdpClient();

async function main() {
  try {
    // Create or get an existing account using CDP SDK
    const account = await cdp.evm.createAccount();
    console.log(`Using CDP account: ${account.address}`);
    // top up the account with some ETH
    const faucetResponse = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "eth",
    });
    console.log(
      `Requested funds from ETH faucet: https://sepolia.basescan.org/tx/${faucetResponse.transactionHash}`,
    );
    // top up account with USDC
    const usdcFaucetResponse = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "usdc",
    });
    console.log(
      `Requested funds from USDC faucet: https://sepolia.basescan.org/tx/${usdcFaucetResponse.transactionHash}`,
    );

    const fetchWithPayment = wrapFetchWithPayment(fetch, account);

    const response = await fetchWithPayment(url, {
      method: "GET",
    });

    // const body = await response.json();
    // console.log(body);
    //
    // const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    // console.log(paymentResponse);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
*/
