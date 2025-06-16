import { describe, it, expect } from "bun:test";
import {
  validateDirectoryEntry,
  validateDirectoryEntryStrict,
} from "../../src/validators/validateDirectoryEntry";
import { type DirectoryEntry } from "../../src/models/DirectoryEntry";

describe("validateDirectoryEntry", () => {
  const validDirectoryEntry: DirectoryEntry = {
    id: "test-api-1",
    url: "https://api.example.com/summarize",
    method: "POST",
    description: "Summarizes text content using AI",
    pointer_topic_id: "0.0.12345",
    initial_price_usdc: 0.01,
  };

  describe("valid entries", () => {
    it("should validate a complete valid directory entry", () => {
      const result = validateDirectoryEntry(validDirectoryEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validDirectoryEntry);
    });

    it("should accept all valid HTTP methods", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ];

      methods.forEach((method) => {
        const entry = { ...validDirectoryEntry, method };
        const result = validateDirectoryEntry(entry);
        expect(result.valid).toBe(true);
      });
    });

    it("should accept minimum length id", () => {
      const entry = { ...validDirectoryEntry, id: "abc" };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(true);
    });

    it("should accept maximum length id", () => {
      const entry = { ...validDirectoryEntry, id: "a".repeat(64) };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(true);
    });

    it("should accept maximum length description", () => {
      const entry = { ...validDirectoryEntry, description: "a".repeat(256) };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(true);
    });

    it("should accept high precision price", () => {
      const entry = { ...validDirectoryEntry, initial_price_usdc: 123.456789 };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid entries", () => {
    it("should reject missing required fields", () => {
      const requiredFields = [
        "id",
        "url",
        "method",
        "description",
        "pointer_topic_id",
        "initial_price_usdc",
      ];

      requiredFields.forEach((field) => {
        const entry = { ...validDirectoryEntry };
        delete (entry as any)[field];

        const result = validateDirectoryEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    it("should reject id that is too short", () => {
      const entry = { ...validDirectoryEntry, id: "ab" };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject id that is too long", () => {
      const entry = { ...validDirectoryEntry, id: "a".repeat(65) };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid URL format", () => {
      const entry = { ...validDirectoryEntry, url: "not-a-url" };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid HTTP method", () => {
      const entry = { ...validDirectoryEntry, method: "INVALID" as any };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject description that is too long", () => {
      const entry = { ...validDirectoryEntry, description: "a".repeat(257) };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid topic ID format", () => {
      const entry = {
        ...validDirectoryEntry,
        pointer_topic_id: "invalid-topic-id",
      };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject negative price", () => {
      const entry = { ...validDirectoryEntry, initial_price_usdc: -0.01 };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject additional properties", () => {
      const entry = { ...validDirectoryEntry, extra_field: "not allowed" };
      const result = validateDirectoryEntry(entry);
      expect(result.valid).toBe(false);
    });

    it("should reject non-object input", () => {
      const inputs = [null, undefined, "string", 123, [], true];

      inputs.forEach((input) => {
        const result = validateDirectoryEntry(input);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe("validateDirectoryEntryStrict", () => {
    it("should return validated data for valid entry", () => {
      const result = validateDirectoryEntryStrict(validDirectoryEntry);
      expect(result).toEqual(validDirectoryEntry);
    });

    it("should throw error for invalid entry", () => {
      const invalidEntry = { ...validDirectoryEntry, id: "ab" }; // too short

      expect(() => {
        validateDirectoryEntryStrict(invalidEntry);
      }).toThrow("DirectoryEntry validation failed");
    });

    it("should include validation error details in thrown error", () => {
      const invalidEntry = { id: "ab" }; // missing required fields

      expect(() => {
        validateDirectoryEntryStrict(invalidEntry);
      }).toThrow(/DirectoryEntry validation failed:/);
    });
  });
});
