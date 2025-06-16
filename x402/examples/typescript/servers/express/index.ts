import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, Resource } from "x402-express";
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

// Add JSON parsing middleware
app.use(express.json());

app.use(
  paymentMiddleware(
    payTo,
    {
      "GET /weather": {
        price: "$0.001",
        network: "base-sepolia",
      },
      "POST /summarise": {
        // USDC amount in dollars
        price: "$0.001",
        // network: "base" // uncomment for Base mainnet
        network: "base-sepolia",
      },
      "POST /add": {
        price: "$0.001",
        network: "base-sepolia",
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);
app.get("/weather", (req, res) => {
  res.send({ weather: "sunny" });
});

const bedrock = new BedrockRuntimeClient({ region: AWS_REGION });

app.post("/summarise", async (req, res): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).send({ error: "Text field is required and must be a string" });
      return;
    }

    // Call Bedrock Converse API to summarize the text
    const modelId = BEDROCK_SONNET_MODEL;

    const messages: any = [
      {
        role: "user",
        content: [{ text: `Please provide a concise summary of the following text:\n\n${text}` }],
      },
    ];

    const convoCmd = new ConverseCommand({
      modelId,
      messages,
      inferenceConfig: { maxTokens: 1024, temperature: 0 },
    });

    const { output } = await bedrock.send(convoCmd);
    const summary = output?.message?.content?.[0]?.text?.trim() ?? "";

    res.send({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to summarize text" });
  }
});

// Simple addition endpoint
app.post("/add", (req, res): void => {
  try {
    const { a, b } = req.body;

    // Validate inputs
    if (typeof a !== "number" || typeof b !== "number") {
      res.status(400).send({ error: "Both 'a' and 'b' must be numbers" });
      return;
    }

    const result = a + b;
    res.send({ result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to add numbers" });
  }
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:${4021}`);
});
