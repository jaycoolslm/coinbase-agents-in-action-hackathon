import type { PointerMessage } from "../models/PointerMessage";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Mirror Node API configuration
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const MIRROR_NODE_BASE_URL =
  HEDERA_NETWORK === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

/**
 * Helper function to fetch the latest pointer message from a pointer topic
 * @param topicId - The Hedera topic ID to fetch from
 * @returns The latest PointerMessage or null if none found
 */
export async function fetchLatestPointerMessage(
  topicId: string
): Promise<PointerMessage | null> {
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
    throw new Error(
      `Failed to fetch pointer message from topic ${topicId}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
