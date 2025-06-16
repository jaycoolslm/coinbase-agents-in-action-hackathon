import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { type PointerMessage } from "../models/PointerMessage.js";
import pointerMessageSchema from "../schemas/pointerMessage.schema.json" assert { type: "json" };

// Create Ajv instance with format support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile the schema
const validateSchema = ajv.compile(pointerMessageSchema);

/**
 * Validation result for PointerMessage
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ErrorObject[];
  data?: PointerMessage;
}

/**
 * Validates a PointerMessage object against the JSON schema
 * @param data - The data to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validatePointerMessage(data: unknown): ValidationResult {
  const valid = validateSchema(data);

  if (valid) {
    return {
      valid: true,
      data: data as unknown as PointerMessage,
    };
  }

  return {
    valid: false,
    errors: validateSchema.errors || [],
  };
}

/**
 * Validates a PointerMessage and throws an error if invalid
 * @param data - The data to validate
 * @returns The validated PointerMessage
 * @throws Error if validation fails
 */
export function validatePointerMessageStrict(data: unknown): PointerMessage {
  const result = validatePointerMessage(data);

  if (!result.valid) {
    const errorMessages =
      result.errors
        ?.map((err) => `${err.instancePath || "root"}: ${err.message}`)
        .join(", ") || "Unknown validation error";

    throw new Error(`PointerMessage validation failed: ${errorMessages}`);
  }

  return result.data!;
}
