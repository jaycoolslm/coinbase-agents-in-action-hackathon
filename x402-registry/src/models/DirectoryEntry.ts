/**
 * TypeScript interface for Directory Entry messages
 * Published to the public Directory Topic on Hedera Consensus Service
 */
export interface DirectoryEntry {
  /** Unique identifier within the directory (3-64 UTF-8 characters) */
  id: string;

  /** Full endpoint URL (e.g., https://api.foo.xyz/summarise) */
  url: string;

  /** Standard HTTP verb */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

  /** Human-readable summary (≤256 characters) */
  description: string;

  /** Hedera topic ID where pricing information lives */
  pointer_topic_id: string;

  /** Copy of the initial price (6 decimal places for USDC) */
  initial_price_usdc: number;
}
