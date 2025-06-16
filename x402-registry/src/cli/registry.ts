#!/usr/bin/env bun

/**
 * CLI utility for the Hedera API Registry
 * Usage:
 *   bun run src/cli/registry.ts add-endpoint <jsonFile>
 *   bun run src/cli/registry.ts update-price <pointerTopicId> <price>
 */

import { readFileSync } from "fs";
import { TopicId } from "@hashgraph/sdk";
import { createHederaClient } from "../lib/hederaClient.js";
import { validateDirectoryEntryStrict } from "../validators/validateDirectoryEntry.js";
import { validatePointerMessageStrict } from "../validators/validatePointerMessage.js";
import type { DirectoryEntry } from "../models/DirectoryEntry.js";
import type { PointerMessage } from "../models/PointerMessage.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const command = args[0];

  try {
    switch (command) {
      case "create-directory":
        await handleCreateDirectory(args.slice(1));
        break;
      case "add-endpoint":
        await handleAddEndpoint(args.slice(1));
        break;
      case "update-price":
        await handleUpdatePrice(args.slice(1));
        break;
      case "help":
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function handleCreateDirectory(args: string[]) {
  console.log("🏗️  Creating the directory topic for the API registry...");

  let hederaClient;

  try {
    // Initialize Hedera client
    console.log("🌐 Connecting to Hedera network...");
    hederaClient = createHederaClient();

    // Create the public directory topic with custom fees
    console.log("📋 Creating directory topic with custom fees...");
    const directoryTopicId = await hederaClient.createTopic({
      memo: "Hedera API Registry - Public Directory Topic",
      submitKeyRequired: false, // Public topic - anyone can submit
      customFeeHbar: 10, // 10 HBAR fee per directory entry submission
    });

    console.log("\n🎉 Directory topic created successfully!");
    console.log(`📋 Directory Topic ID: ${directoryTopicId.toString()}`);
    console.log(`💰 Custom Fee: 10 HBAR per entry submission`);
    console.log(`🔓 Public Topic: Anyone can submit entries (with fee)`);

    console.log("\n📝 Next Steps:");
    console.log("1. Add this topic ID to your .env file:");
    console.log(`   DIRECTORY_TOPIC_ID=${directoryTopicId.toString()}`);
    console.log(
      "2. Share this topic ID with API providers who want to register endpoints"
    );
    console.log(
      "3. Users can now run: bun run src/cli/registry.ts add-endpoint <jsonFile>"
    );
  } catch (error) {
    console.error(
      "❌ Error creating directory topic:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    if (hederaClient) {
      hederaClient.close();
    }
  }
}

async function handleAddEndpoint(args: string[]) {
  if (args.length !== 1) {
    console.error("Usage: add-endpoint <jsonFile>");
    process.exit(1);
  }

  const jsonFile = args[0];
  console.log(`📝 Adding endpoint from file: ${jsonFile}`);

  let hederaClient;

  try {
    // Step 3.3.1: Read & validate JSON file against directory schema
    console.log("🔍 Reading and validating JSON file...");
    const fileContent = readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Validate against directory entry schema
    const directoryEntry = validateDirectoryEntryStrict(jsonData);
    console.log(`✅ Directory entry validated: ${directoryEntry.id}`);

    // Initialize Hedera client
    console.log("🌐 Connecting to Hedera network...");
    hederaClient = createHederaClient();

    // Step 3.3.2: Create pointer topic with submit key restricted to caller
    console.log("📊 Creating pointer topic for price updates...");
    const pointerTopicId = await hederaClient.createPointerTopic({
      memo: `Pricing for API: ${directoryEntry.id}`,
      // You can add custom fee here if needed: customFeeHbar: 1.0
    });
    console.log(`✅ Pointer topic created: ${pointerTopicId.toString()}`);

    // Update directory entry with the new pointer topic ID
    const completeDirectoryEntry: DirectoryEntry = {
      ...directoryEntry,
      pointer_topic_id: pointerTopicId.toString(),
    };

    // Step 3.3.3: Submit directory entry to the directory topic with custom 10 HBAR fixed fee
    console.log("📤 Submitting directory entry to registry...");
    await hederaClient.submitDirectoryEntry(completeDirectoryEntry);
    console.log("✅ Directory entry submitted successfully");

    console.log("\n🎉 Endpoint successfully added to registry!");
    console.log(`📍 Directory Entry ID: ${directoryEntry.id}`);
    console.log(`🔗 Endpoint URL: ${directoryEntry.url}`);
    console.log(`📊 Pointer Topic: ${pointerTopicId.toString()}`);
    console.log(
      `💵 Directory Price: ${directoryEntry.initial_price_usdc} USDC`
    );

    console.log("\n📝 Next Steps:");
    console.log(
      "1. Create your API specification file with pricing and schemas"
    );
    console.log(
      `2. Run: bun run src/cli/registry.ts update-price ${pointerTopicId.toString()} <price> <api-spec.json>`
    );
  } catch (error) {
    console.error(
      "❌ Error adding endpoint:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    if (hederaClient) {
      hederaClient.close();
    }
  }
}

async function handleUpdatePrice(args: string[]) {
  if (args.length !== 3) {
    console.error("Usage: update-price <pointerTopicId> <price> <jsonFile>");
    console.error("Example: update-price 0.0.123456 0.05 pointer-message.json");
    process.exit(1);
  }

  const [pointerTopicIdStr, priceStr, jsonFile] = args;
  const newPrice = parseFloat(priceStr);

  if (isNaN(newPrice) || newPrice <= 0) {
    console.error("❌ Price must be a positive number");
    process.exit(1);
  }

  console.log(`💰 Updating pointer topic ${pointerTopicIdStr}...`);

  let hederaClient;

  try {
    // Initialize Hedera client
    console.log("🌐 Connecting to Hedera network...");
    hederaClient = createHederaClient();

    const pointerTopicId = TopicId.fromString(pointerTopicIdStr);

    // Read and validate the JSON file
    console.log(`📄 Reading pointer message from ${jsonFile}...`);
    const fileContent = readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Validate against pointer message schema
    const pointerMessage = validatePointerMessageStrict(jsonData);

    // Override price with command line value and increment version
    pointerMessage.price_usdc = newPrice;
    pointerMessage.version = (pointerMessage.version || 0) + 1;

    console.log(`✅ Pointer message validated with API schemas`);

    // Submit the updated pointer message
    console.log("📤 Submitting pointer message update...");
    await hederaClient.submitPriceUpdate(pointerTopicId, pointerMessage);

    console.log("\n🎉 Pointer topic updated successfully!");
    console.log(`💵 New Price: ${pointerMessage.price_usdc} USDC`);
    console.log(`🔢 Version: ${pointerMessage.version}`);
    console.log("📥 Request schema updated");
    console.log("📤 Response schema updated");
  } catch (error) {
    console.error(
      "❌ Error updating pointer topic:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    if (hederaClient) {
      hederaClient.close();
    }
  }
}

function printUsage() {
  console.log(`
Hedera API Registry CLI

Usage:
  bun run src/cli/registry.ts <command> [arguments]

Commands:
  create-directory                  Create the directory topic (run once by admin)
  add-endpoint <jsonFile>           Add a new API endpoint to the registry
  update-price <topicId> <price> [jsonFile]  Update price and optionally API specs
  help                              Show this help message

Examples:
  bun run src/cli/registry.ts create-directory
  bun run src/cli/registry.ts add-endpoint example-directory-entry.json
  bun run src/cli/registry.ts update-price 0.0.123456 0.10
  bun run src/cli/registry.ts update-price 0.0.123456 0.05 example-pointer-message.json
`);
}

// Run the CLI if this file is executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
