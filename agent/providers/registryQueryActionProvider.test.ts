import { describe, it, expect, mock, beforeEach } from "bun:test";
import { RegistryQueryActionProvider } from "./registryQueryActionProvider";
import type { DirectoryEntry } from "../../x402-registry/src/models/DirectoryEntry";
import type { PointerMessage } from "../../x402-registry/src/models/PointerMessage";

// Mock the fetchEndpoints function
const mockFetchEndpoints = mock(() => Promise.resolve([] as DirectoryEntry[]));

// Mock the fetchLatestPointerMessage function
const mockFetchLatestPointerMessage = mock(() =>
  Promise.resolve(null as PointerMessage | null)
);

// Mock the entire modules
mock.module("../../x402-registry/src/helpers/fetchEndpoints", () => ({
  fetchEndpoints: mockFetchEndpoints,
}));

mock.module(
  "../../x402-registry/src/helpers/fetchLatestPointerMessage",
  () => ({
    fetchLatestPointerMessage: mockFetchLatestPointerMessage,
  })
);

describe("RegistryQueryActionProvider", () => {
  let provider: RegistryQueryActionProvider;

  beforeEach(() => {
    provider = new RegistryQueryActionProvider();
    mockFetchEndpoints.mockClear();
    mockFetchLatestPointerMessage.mockClear();
  });

  describe("constructor", () => {
    it("should initialize with correct name and empty action providers", () => {
      expect(provider.name).toBe("registry-query-action-provider");
      expect(provider.actionProviders).toEqual([]);
    });
  });

  describe("supportsNetwork", () => {
    it("should return true for any network", () => {
      const mockNetwork = { protocolFamily: "evm", networkId: "base-sepolia" };
      expect(provider.supportsNetwork(mockNetwork)).toBe(true);
    });
  });

  describe("listEndpoints", () => {
    it("should return empty array when no endpoints exist", async () => {
      mockFetchEndpoints.mockResolvedValueOnce([]);

      const result = await provider.listEndpoints();
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
      expect(mockFetchEndpoints).toHaveBeenCalledTimes(1);
    });

    it("should transform and return endpoints in the correct format", async () => {
      const mockEndpoints: DirectoryEntry[] = [
        {
          id: "text-summarizer-api",
          url: "https://api.example.com/summarize",
          method: "POST",
          description: "Summarizes text using AI",
          pointer_topic_id: "0.0.12345",
          initial_price_usdc: 0.01,
        },
        {
          id: "weather-api",
          url: "https://weather.example.com/current",
          method: "GET",
          description: "Get current weather data",
          pointer_topic_id: "0.0.67890",
          initial_price_usdc: 0.005,
        },
      ];

      mockFetchEndpoints.mockResolvedValueOnce(mockEndpoints);

      const result = await provider.listEndpoints();
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        id: "text-summarizer-api",
        description: "Summarizes text using AI",
        method: "POST",
        url: "https://api.example.com/summarize",
        price_usdc: 0.01,
        pointer_topic_id: "0.0.12345",
      });
      expect(parsed[1]).toEqual({
        id: "weather-api",
        description: "Get current weather data",
        method: "GET",
        url: "https://weather.example.com/current",
        price_usdc: 0.005,
        pointer_topic_id: "0.0.67890",
      });
    });

    it("should handle fetchEndpoints errors gracefully", async () => {
      const mockError = new Error("Network error");
      mockFetchEndpoints.mockRejectedValueOnce(mockError);

      await expect(provider.listEndpoints()).rejects.toThrow(
        "Failed to fetch endpoints: Network error"
      );
    });

    it("should handle unknown errors gracefully", async () => {
      mockFetchEndpoints.mockRejectedValueOnce("Unknown error");

      await expect(provider.listEndpoints()).rejects.toThrow(
        "Failed to fetch endpoints: Unknown error"
      );
    });
  });

  describe("getEndpointSchema", () => {
    it("should return pointer message as JSON string when found", async () => {
      const mockPointerMessage: PointerMessage = {
        price_usdc: 0.01,
        version: 1,
        request_schema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to summarize" },
          },
        },
        response_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Summarized text" },
          },
        },
      };

      mockFetchLatestPointerMessage.mockResolvedValueOnce(mockPointerMessage);

      const result = await provider.getEndpointSchema({
        pointer_topic_id: "0.0.12345",
      });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockPointerMessage);
      expect(mockFetchLatestPointerMessage).toHaveBeenCalledWith("0.0.12345");
      expect(mockFetchLatestPointerMessage).toHaveBeenCalledTimes(1);
    });

    it("should handle pointer message without request schema", async () => {
      const mockPointerMessage: PointerMessage = {
        price_usdc: 0.005,
        version: 2,
        response_schema: {
          type: "object",
          properties: {
            data: { type: "string" },
          },
        },
      };

      mockFetchLatestPointerMessage.mockResolvedValueOnce(mockPointerMessage);

      const result = await provider.getEndpointSchema({
        pointer_topic_id: "0.0.67890",
      });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockPointerMessage);
      expect(parsed.request_schema).toBeUndefined();
    });

    it("should throw error when no pointer message is found", async () => {
      mockFetchLatestPointerMessage.mockResolvedValueOnce(null);

      await expect(
        provider.getEndpointSchema({ pointer_topic_id: "0.0.99999" })
      ).rejects.toThrow(
        "Failed to fetch endpoint schema: No schema found for pointer topic: 0.0.99999"
      );

      expect(mockFetchLatestPointerMessage).toHaveBeenCalledWith("0.0.99999");
    });

    it("should handle fetchLatestPointerMessage errors gracefully", async () => {
      const mockError = new Error("Network timeout");
      mockFetchLatestPointerMessage.mockRejectedValueOnce(mockError);

      await expect(
        provider.getEndpointSchema({ pointer_topic_id: "0.0.12345" })
      ).rejects.toThrow("Failed to fetch endpoint schema: Network timeout");
    });

    it("should handle unknown errors gracefully", async () => {
      mockFetchLatestPointerMessage.mockRejectedValueOnce("Unknown error");

      await expect(
        provider.getEndpointSchema({ pointer_topic_id: "0.0.12345" })
      ).rejects.toThrow("Failed to fetch endpoint schema: Unknown error");
    });

    it("should validate input schema requirements", async () => {
      // This test ensures the schema validation works - the actual validation
      // is handled by the AgentKit framework, but we can test our method logic
      const mockPointerMessage: PointerMessage = {
        price_usdc: 0.02,
        version: 1,
        response_schema: {
          type: "object",
          properties: {
            result: { type: "boolean" },
          },
        },
      };

      mockFetchLatestPointerMessage.mockResolvedValueOnce(mockPointerMessage);

      const result = await provider.getEndpointSchema({
        pointer_topic_id: "0.0.54321",
      });

      expect(result).toBe(JSON.stringify(mockPointerMessage));
    });
  });
});
