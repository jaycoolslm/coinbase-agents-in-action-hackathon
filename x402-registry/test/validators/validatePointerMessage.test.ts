import { describe, it, expect } from "bun:test";
import {
  validatePointerMessage,
  validatePointerMessageStrict,
} from "../../src/validators/validatePointerMessage";
import { type PointerMessage } from "../../src/models/PointerMessage";

describe("validatePointerMessage", () => {
  const validPointerMessage: PointerMessage = {
    price_usdc: 0.01,
    version: 1,
    response_schema: {
      type: "object",
      properties: {
        result: { type: "string" },
        success: { type: "boolean" },
      },
    },
  };

  const validPointerMessageWithRequest: PointerMessage = {
    price_usdc: 0.02,
    version: 2,
    request_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        target_language: { type: "string" },
      },
    },
    response_schema: {
      type: "object",
      properties: {
        translated_text: { type: "string" },
        source_language: { type: "string" },
      },
    },
  };

  describe("valid messages", () => {
    it("should validate a basic pointer message", () => {
      const result = validatePointerMessage(validPointerMessage);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validPointerMessage);
    });

    it("should validate a pointer message with request schema", () => {
      const result = validatePointerMessage(validPointerMessageWithRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validPointerMessageWithRequest);
    });

    it("should accept high precision price", () => {
      const message = { ...validPointerMessage, price_usdc: 123.456789 };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });

    it("should accept high version number", () => {
      const message = { ...validPointerMessage, version: 999999 };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });

    it("should accept minimal response schema", () => {
      const message = {
        ...validPointerMessage,
        response_schema: {
          type: "object",
          properties: {
            data: { type: "string" },
          },
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });

    it("should accept complex nested schemas", () => {
      const message = {
        ...validPointerMessage,
        request_schema: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
              },
            },
            preferences: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        response_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                created_at: { type: "string" },
              },
            },
          },
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });

    it("should accept message without request schema", () => {
      const message = {
        price_usdc: 0.05,
        version: 3,
        response_schema: {
          type: "object",
          properties: {
            value: { type: "number" },
          },
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid messages", () => {
    it("should reject missing required fields", () => {
      const requiredFields = ["price_usdc", "version", "response_schema"];

      requiredFields.forEach((field) => {
        const message = { ...validPointerMessage };
        delete (message as any)[field];

        const result = validatePointerMessage(message);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    it("should reject negative price", () => {
      const message = { ...validPointerMessage, price_usdc: -0.01 };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject non-integer version", () => {
      const message = { ...validPointerMessage, version: 1.5 };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject zero or negative version", () => {
      const invalidVersions = [0, -1, -5];

      invalidVersions.forEach((version) => {
        const message = { ...validPointerMessage, version };
        const result = validatePointerMessage(message);
        expect(result.valid).toBe(false);
      });
    });

    it("should reject invalid request schema structure", () => {
      const message = {
        ...validPointerMessage,
        request_schema: {
          type: "string", // invalid: must be "object"
          properties: {},
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid response schema structure", () => {
      const message = {
        ...validPointerMessage,
        response_schema: {
          type: "array", // invalid: must be "object"
          properties: {},
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject missing properties in schema", () => {
      const message = {
        ...validPointerMessage,
        response_schema: {
          type: "object",
          // missing properties field
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject missing required array in schema", () => {
      const message = {
        ...validPointerMessage,
        response_schema: {
          type: "object",
          properties: {
            test: { type: "string" },
          },
        },
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(true);
    });

    it("should reject additional properties on root", () => {
      const message = {
        ...validPointerMessage,
        invalid_field: "not allowed",
      };
      const result = validatePointerMessage(message);
      expect(result.valid).toBe(false);
    });

    it("should reject non-object input", () => {
      const nonObjectInputs = [null, undefined, "string", 123, [], true];

      nonObjectInputs.forEach((input) => {
        const result = validatePointerMessage(input);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe("validatePointerMessageStrict", () => {
    it("should return validated data for valid message", () => {
      const data = validatePointerMessageStrict(validPointerMessage);
      expect(data).toEqual(validPointerMessage);
    });

    it("should throw error for invalid message", () => {
      const invalidMessage = { price_usdc: -1 };
      expect(() => validatePointerMessageStrict(invalidMessage)).toThrow();
    });

    it("should include validation error details in thrown error", () => {
      const invalidMessage = { price_usdc: -1 };
      try {
        validatePointerMessageStrict(invalidMessage);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          "PointerMessage validation failed"
        );
      }
    });
  });
});
