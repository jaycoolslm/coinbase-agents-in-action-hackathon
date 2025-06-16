import {
  ActionProvider,
  WalletProvider,
  type Network,
  CreateAction,
} from "@coinbase/agentkit";
import { z } from "zod";
import { fetchEndpoints } from "../../x402-registry/src/helpers/fetchEndpoints";
import { fetchLatestPointerMessage } from "../../x402-registry/src/helpers/fetchLatestPointerMessage";

// Placeholder schemas for upcoming actions
const ListEndpointsSchema = z.object({});

const GetEndpointSchemaSchema = z.object({
  pointer_topic_id: z.string(),
});

/**
 * Registry Query Action Provider
 * Provides actions for discovering and querying API endpoints from the X402 registry
 */
export class RegistryQueryActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("registry-query-action-provider", []);
  }

  /**
   * List all available API endpoints from the X402 registry
   * @returns JSON string array of endpoints with their details
   */
  @CreateAction({
    name: "list-endpoints",
    description: "List all available API endpoints from the X402 registry",
    schema: ListEndpointsSchema,
  })
  async listEndpoints(): Promise<string> {
    try {
      const endpoints = await fetchEndpoints();

      // Transform to the required format
      const transformedEndpoints = endpoints.map((endpoint) => ({
        id: endpoint.id,
        description: endpoint.description,
        method: endpoint.method,
        url: endpoint.url,
        price_usdc: endpoint.initial_price_usdc,
        pointer_topic_id: endpoint.pointer_topic_id,
      }));

      return JSON.stringify(transformedEndpoints);
    } catch (error) {
      throw new Error(
        `Failed to fetch endpoints: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get the detailed schema for a specific API endpoint
   * @param args - Object containing the pointer_topic_id
   * @returns JSON string containing the full pointer message with schema details
   */
  @CreateAction({
    name: "get-endpoint-schema",
    description:
      "Get the detailed schema and pricing for a specific API endpoint",
    schema: GetEndpointSchemaSchema,
  })
  async getEndpointSchema(
    args: z.infer<typeof GetEndpointSchemaSchema>
  ): Promise<string> {
    try {
      const { pointer_topic_id } = args;

      const pointerMessage = await fetchLatestPointerMessage(pointer_topic_id);

      if (!pointerMessage) {
        throw new Error(
          `No schema found for pointer topic: ${pointer_topic_id}`
        );
      }

      return JSON.stringify(pointerMessage);
    } catch (error) {
      throw new Error(
        `Failed to fetch endpoint schema: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if the provider supports the given network
   * @param network - The network to check
   * @returns Always returns true as this provider works with any network
   */
  supportsNetwork = (network: Network) => true;
}

/**
 * Factory function to create a new RegistryQueryActionProvider instance
 * @returns A new RegistryQueryActionProvider instance
 */
export function registryQueryActionProvider(): RegistryQueryActionProvider {
  return new RegistryQueryActionProvider();
}
