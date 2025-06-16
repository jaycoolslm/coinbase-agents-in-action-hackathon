import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  fetchEndpoints,
  clearEndpointsCache,
} from "../../src/helpers/fetchEndpoints.js";
import type { DirectoryEntry } from "../../src/models/DirectoryEntry.js";
import type { PointerMessage } from "../../src/models/PointerMessage.js";

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds for integration tests
const CLI_PATH = join(process.cwd(), "src/cli/registry.ts");

describe("Registry Integration Tests", () => {
  let tempDir: string;
  let testJsonFile: string;
  let testDirectoryEntry: DirectoryEntry;
  let initialEndpointCount: number;

  beforeAll(async () => {
    // Verify required environment variables are set
    if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
      throw new Error(
        "Integration tests require OPERATOR_ID and OPERATOR_KEY environment variables"
      );
    }

    if (!process.env.DIRECTORY_TOPIC_ID) {
      throw new Error(
        "Integration tests require DIRECTORY_TOPIC_ID environment variable"
      );
    }

    // Create temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), "registry-integration-"));

    // Generate unique test data to avoid conflicts
    const timestamp = Date.now();
    testDirectoryEntry = {
      id: `test-api-${timestamp}`,
      url: `https://test-api-${timestamp}.example.com/endpoint`,
      method: "POST",
      description: `Integration test API created at ${new Date().toISOString()}`,
      pointer_topic_id: "0.0.000000", // Will be populated by CLI
      initial_price_usdc: 0.01,
    };

    // Write test JSON file
    testJsonFile = join(tempDir, "test-directory-entry.json");
    writeFileSync(testJsonFile, JSON.stringify(testDirectoryEntry, null, 2));

    // Clear cache before starting tests
    clearEndpointsCache();

    // Get initial endpoint count for comparison
    try {
      const initialEndpoints = await fetchEndpoints();
      initialEndpointCount = initialEndpoints.length;
      console.log(`Initial endpoint count: ${initialEndpointCount}`);
    } catch (error) {
      // If directory topic is empty or doesn't exist, start with 0
      initialEndpointCount = 0;
      console.log("Directory topic appears to be empty, starting with count 0");
    }
  });

  afterAll(() => {
    // Clean up temporary files
    try {
      unlinkSync(testJsonFile);
    } catch (error) {
      // File might not exist, ignore
    }
  });

  test(
    "should successfully add endpoint via CLI and verify in directory topic",
    async () => {
      // Step 1: Execute CLI add-endpoint command
      console.log(`Adding endpoint via CLI: ${testDirectoryEntry.id}`);

      const cliResult = await executeCLI(["add-endpoint", testJsonFile]);

      expect(cliResult.exitCode).toBe(0);
      expect(cliResult.stdout).toContain(
        "✅ Directory entry submitted successfully"
      );
      expect(cliResult.stdout).toContain(
        "🎉 Endpoint successfully added to registry!"
      );
      expect(cliResult.stdout).toContain(testDirectoryEntry.id);

      // Extract pointer topic ID from CLI output
      const pointerTopicMatch = cliResult.stdout.match(
        /📊 Pointer Topic: (0\.0\.\d+)/
      );
      expect(pointerTopicMatch).toBeTruthy();
      const pointerTopicId = pointerTopicMatch![1];
      console.log(`Pointer topic created: ${pointerTopicId}`);

      // Step 2: Wait a moment for Hedera consensus and mirror node propagation
      console.log(
        "Waiting for Hedera consensus and mirror node propagation..."
      );
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay

      // Step 3: Clear cache and fetch endpoints to verify the new entry
      clearEndpointsCache();
      console.log("Fetching endpoints from directory topic...");

      const endpoints = await fetchEndpoints();

      // Step 4: Verify the new endpoint appears in the list
      expect(endpoints.length).toBe(initialEndpointCount + 1);

      const addedEndpoint = endpoints.find(
        (endpoint) => endpoint.id === testDirectoryEntry.id
      );
      expect(addedEndpoint).toBeTruthy();

      if (addedEndpoint) {
        expect(addedEndpoint.id).toBe(testDirectoryEntry.id);
        expect(addedEndpoint.url).toBe(testDirectoryEntry.url);
        expect(addedEndpoint.method).toBe(testDirectoryEntry.method);
        expect(addedEndpoint.description).toBe(testDirectoryEntry.description);
        expect(addedEndpoint.initial_price_usdc).toBe(
          testDirectoryEntry.initial_price_usdc
        );
        expect(addedEndpoint.pointer_topic_id).toBe(pointerTopicId);

        console.log("✅ Endpoint successfully verified in directory topic:");
        console.log(`   ID: ${addedEndpoint.id}`);
        console.log(`   URL: ${addedEndpoint.url}`);
        console.log(`   Pointer Topic: ${addedEndpoint.pointer_topic_id}`);
      }
    },
    TEST_TIMEOUT
  );

  test(
    "should successfully update price via CLI and fetch latest price from pointer topic",
    async () => {
      // Step 1: First add an endpoint to get a pointer topic
      console.log("Creating endpoint for price update test...");
      const addResult = await executeCLI(["add-endpoint", testJsonFile]);
      expect(addResult.exitCode).toBe(0);

      // Extract pointer topic ID
      const pointerTopicMatch = addResult.stdout.match(
        /📊 Pointer Topic: (0\.0\.\d+)/
      );
      expect(pointerTopicMatch).toBeTruthy();
      const pointerTopicId = pointerTopicMatch![1];
      console.log(`Using pointer topic for price update: ${pointerTopicId}`);

      // Step 2: Create a pointer message JSON file for the update
      const testPointerMessage: PointerMessage = {
        price_usdc: 0.02,
        version: 1,
        request_schema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "Test input for price update",
            },
          },
        },
        response_schema: {
          type: "object",
          properties: {
            output: {
              type: "string",
              description: "Test output for price update",
            },
          },
        },
      };

      const pointerMessageFile = join(tempDir, "test-pointer-message.json");
      writeFileSync(
        pointerMessageFile,
        JSON.stringify(testPointerMessage, null, 2)
      );

      // Step 3: Wait for initial setup to propagate
      console.log("Waiting for initial topic setup to propagate...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Step 4: Execute CLI update-price command
      const newPrice = 0.08;
      console.log(
        `Updating price to ${newPrice} for pointer topic ${pointerTopicId}`
      );

      const updateResult = await executeCLI([
        "update-price",
        pointerTopicId,
        newPrice.toString(),
        pointerMessageFile,
      ]);

      expect(updateResult.exitCode).toBe(0);
      expect(updateResult.stdout).toContain(
        "🎉 Pointer topic updated successfully!"
      );
      expect(updateResult.stdout).toContain(`💵 New Price: ${newPrice} USDC`);
      expect(updateResult.stdout).toContain("🔢 Version: 2"); // Should increment from 1 to 2

      // Step 5: Wait for price update to propagate
      console.log("Waiting for price update to propagate...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Step 6: Fetch latest price from pointer topic and verify version increment
      console.log(
        `Fetching latest price from pointer topic ${pointerTopicId}...`
      );
      const latestPrice = await fetchLatestPointerMessage(pointerTopicId);

      expect(latestPrice).toBeTruthy();
      if (latestPrice) {
        expect(latestPrice.price_usdc).toBe(newPrice);
        expect(latestPrice.version).toBe(2); // Should be incremented

        console.log("✅ Price update successfully verified:");
        console.log(`   Price: ${latestPrice.price_usdc} USDC`);
        console.log(`   Version: ${latestPrice.version}`);
        console.log(`   Topic: ${pointerTopicId}`);
      }

      // Clean up test files
      try {
        unlinkSync(pointerMessageFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    },
    TEST_TIMEOUT
  );
});

/**
 * Helper function to execute CLI commands and capture output
 */
function executeCLI(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", CLI_PATH, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      reject(error);
    });

    // Set timeout for CLI execution
    setTimeout(() => {
      child.kill();
      reject(new Error("CLI command timed out"));
    }, TEST_TIMEOUT - 5000); // 5 second buffer
  });
}

/**
 * Helper function to fetch the latest pointer message from a pointer topic
 */
async function fetchLatestPointerMessage(
  topicId: string
): Promise<PointerMessage | null> {
  const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
  const MIRROR_NODE_BASE_URL =
    HEDERA_NETWORK === "mainnet"
      ? "https://mainnet-public.mirrornode.hedera.com"
      : "https://testnet.mirrornode.hedera.com";

  try {
    // Fetch messages from the pointer topic (latest first)
    const response = await fetch(
      `${MIRROR_NODE_BASE_URL}/api/v1/topics/${topicId}/messages?order=desc&limit=1`
    );

    if (!response.ok) {
      throw new Error(
        `Mirror Node API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.messages || data.messages.length === 0) {
      return null;
    }

    // Decode the latest message
    const message = data.messages[0];
    const messageContent = Buffer.from(message.message, "base64").toString(
      "utf-8"
    );
    const pointerMessage = JSON.parse(messageContent) as PointerMessage;

    return pointerMessage;
  } catch (error) {
    console.error("Error fetching pointer message:", error);
    return null;
  }
}
