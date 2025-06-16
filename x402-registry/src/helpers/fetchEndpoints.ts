import type { DirectoryEntry } from "../models/DirectoryEntry";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Mirror Node API configuration
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const MIRROR_NODE_BASE_URL =
  HEDERA_NETWORK === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

// Directory topic configuration
const DIRECTORY_TOPIC_ID = process.env.DIRECTORY_TOPIC_ID;

// Cache configuration
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

// Mirror Node API response interfaces
interface MirrorNodeMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string; // Base64 encoded
  running_hash: string;
  running_hash_version: number;
  sequence_number: number;
}

interface MirrorNodeTopicResponse {
  messages: MirrorNodeMessage[];
  links: {
    next?: string;
  };
}

// Cache entry interface
interface CacheEntry {
  data: DirectoryEntry[];
  timestamp: number;
}

// Simple in-memory cache
class EndpointsCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): DirectoryEntry[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: DirectoryEntry[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const endpointsCache = new EndpointsCache();

/**
 * Fetches all endpoint entries from the Hedera directory topic
 * Uses in-memory caching with 30-second TTL to avoid redundant API calls
 * @returns Promise<DirectoryEntry[]> Array of directory entries
 */
export async function fetchEndpoints(): Promise<DirectoryEntry[]> {
  if (!DIRECTORY_TOPIC_ID) {
    throw new Error(
      "DIRECTORY_TOPIC_ID environment variable is not configured"
    );
  }

  // Check cache first
  const cachedResult = endpointsCache.get(DIRECTORY_TOPIC_ID);
  if (cachedResult) {
    console.debug(`Cache hit for directory topic ${DIRECTORY_TOPIC_ID}`);
    return cachedResult;
  }

  console.debug(
    `Cache miss for directory topic ${DIRECTORY_TOPIC_ID}, fetching from Mirror Node...`
  );

  try {
    // Fetch all messages from the directory topic using Mirror Node REST API
    const allMessages = await fetchAllTopicMessages(DIRECTORY_TOPIC_ID);

    // Parse and validate directory entries from messages, keeping message metadata
    const validEntries: Array<{
      entry: DirectoryEntry;
      message: MirrorNodeMessage;
    }> = [];

    for (const message of allMessages) {
      try {
        // Decode base64 message content
        const messageContent = Buffer.from(message.message, "base64").toString(
          "utf-8"
        );
        const parsedEntry = JSON.parse(messageContent) as DirectoryEntry;

        // Enhanced validation for DirectoryEntry structure
        if (isValidDirectoryEntry(parsedEntry)) {
          validEntries.push({ entry: parsedEntry, message });
        }
      } catch (parseError) {
        // Skip invalid messages (could be other types of messages)
        console.warn(
          `Skipping invalid directory entry message at sequence ${
            message.sequence_number
          }: ${
            parseError instanceof Error ? parseError.message : "Unknown error"
          }`
        );
      }
    }

    // Deduplicate by id (keep the latest by sequence number) and sort alphabetically
    const deduplicatedEntries = deduplicateByIdEnhanced(validEntries);
    const sortedEntries = deduplicatedEntries.sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    // Cache the result
    endpointsCache.set(DIRECTORY_TOPIC_ID, sortedEntries);
    console.debug(
      `Cached ${sortedEntries.length} endpoints for directory topic ${DIRECTORY_TOPIC_ID}`
    );

    return sortedEntries;
  } catch (error) {
    throw new Error(
      `Failed to fetch endpoints from directory topic: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Clears the endpoints cache
 * Useful for testing or forcing a fresh fetch
 */
export function clearEndpointsCache(): void {
  endpointsCache.clear();
  console.debug("Endpoints cache cleared");
}

/**
 * Gets cache statistics
 * Useful for monitoring and debugging
 */
export function getCacheStats(): { size: number; ttlMs: number } {
  return {
    size: endpointsCache.size(),
    ttlMs: CACHE_TTL_MS,
  };
}

/**
 * Fetches all messages from a Hedera topic using pagination
 */
async function fetchAllTopicMessages(
  topicId: string
): Promise<MirrorNodeMessage[]> {
  const allMessages: MirrorNodeMessage[] = [];
  let nextUrl = `${MIRROR_NODE_BASE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl);

    if (!response.ok) {
      throw new Error(
        `Mirror Node API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: MirrorNodeTopicResponse = await response.json();
    allMessages.push(...data.messages);

    // Check if there are more pages
    nextUrl = data.links.next
      ? `${MIRROR_NODE_BASE_URL}${data.links.next}`
      : "";
  }

  return allMessages;
}

/**
 * Enhanced validation for DirectoryEntry structure
 */
function isValidDirectoryEntry(entry: any): entry is DirectoryEntry {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.id === "string" &&
    entry.id.trim().length >= 3 &&
    entry.id.trim().length <= 64 &&
    typeof entry.url === "string" &&
    entry.url.startsWith("http") &&
    typeof entry.method === "string" &&
    ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(
      entry.method
    ) &&
    typeof entry.description === "string" &&
    entry.description.length <= 256 &&
    typeof entry.pointer_topic_id === "string" &&
    entry.pointer_topic_id.trim().length > 0 &&
    typeof entry.initial_price_usdc === "number" &&
    entry.initial_price_usdc >= 0
  );
}

/**
 * Enhanced deduplication by ID, keeping the latest entry by sequence number
 */
function deduplicateByIdEnhanced(
  validEntries: Array<{ entry: DirectoryEntry; message: MirrorNodeMessage }>
): DirectoryEntry[] {
  const entryMap = new Map<
    string,
    { entry: DirectoryEntry; sequenceNumber: number }
  >();

  validEntries.forEach(({ entry, message }) => {
    const existingEntry = entryMap.get(entry.id);

    if (
      !existingEntry ||
      message.sequence_number > existingEntry.sequenceNumber
    ) {
      entryMap.set(entry.id, {
        entry,
        sequenceNumber: message.sequence_number,
      });
    }
  });

  return Array.from(entryMap.values()).map((item) => item.entry);
}
