import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, Resource } from "x402-express";
import multer from "multer";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as `0x${string}`;

// AWS / Bedrock configuration – replace with your own IDs & bucket
const {
  AWS_REGION = "eu-west-2",
  BEDROCK_SONNET_MODEL = "anthropic.claude-3-sonnet-20240229-v1:0", // default 200k-token context
} = process.env;

if (!facilitatorUrl || !payTo) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();

app.use(
  paymentMiddleware(
    payTo,
    {
      "POST /pdf-table-to-csv": {
        // USDC amount in dollars
        price: "$0.001",
        // network: "base" // uncomment for Base mainnet
        network: "base-sepolia",
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

// Multer setup for in-memory file handling
const upload = multer({ storage: multer.memoryStorage() });

const bedrock = new BedrockRuntimeClient({ region: AWS_REGION });

app.post("/pdf-table-to-csv", upload.single("file"), async (req, res): Promise<void> => {
  try {
    const file = (req as any).file as any | undefined;
    if (!file) {
      res.status(400).send({ error: "No file uploaded" });
      return;
    }

    // Call Bedrock Converse API directly with PDF bytes
    const modelId = BEDROCK_SONNET_MODEL;

    // Sanitize filename for Bedrock - only alphanumeric, whitespace, hyphens, parentheses, square brackets allowed
    const sanitizedName =
      (file.originalname ?? "upload.pdf")
        .replace(/\.pdf$/i, "") // Remove .pdf extension
        .replace(/[^a-zA-Z0-9\s\-\(\)\[\]]/g, "_") // Replace invalid chars with underscore
        .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
        .trim() || "document";

    const messages: any = [
      {
        role: "user",
        content: [
          { text: "Extract the first table and return CSV only." },
          {
            document: {
              format: "pdf",
              name: sanitizedName,
              source: { bytes: file.buffer as Uint8Array },
            },
          },
        ],
      },
    ];

    const convoCmd = new ConverseCommand({
      modelId,
      messages,
      inferenceConfig: { maxTokens: 1024, temperature: 0 },
    });

    const { output } = await bedrock.send(convoCmd);
    const csv = output?.message?.content?.[0]?.text?.trim() ?? "";

    console.log(csv);

    res.send({ csv });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to process PDF" });
  }
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:${4021}`);
});
