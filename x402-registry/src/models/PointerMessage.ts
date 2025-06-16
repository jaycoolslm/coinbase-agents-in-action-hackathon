/**
 * TypeScript interface for Pointer Message
 * Published to private Pointer Topics for pricing updates
 * Only the most recent message is authoritative
 */
export interface PointerMessage {
  /** Current charge per request (6 decimal places for USDC) */
  price_usdc: number;

  /** Version number, incremented on every update */
  version: number;

  /** Request body schema (JSON object schema for POST/PUT/PATCH endpoints) */
  request_schema?: {
    /** Object type (always "object" for JSON) */
    type: "object";
    /** Properties definition */
    properties: Record<string, any>;
  };

  /** Response schema definition (JSON object schema) */
  response_schema: {
    /** Object type (always "object" for JSON) */
    type: "object";
    /** Properties definition */
    properties: Record<string, any>;
  };
}
