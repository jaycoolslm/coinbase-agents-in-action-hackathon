import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { type DirectoryEntry } from "../models/DirectoryEntry.js";
import directoryEntrySchema from "../schemas/directoryEntry.schema.json" assert { type: "json" };

// Create Ajv instance with format support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile the schema
const validateSchema = ajv.compile(directoryEntrySchema);

/**
 * Validation result for DirectoryEntry
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ErrorObject[];
  data?: DirectoryEntry;
}

/**
 * Validates a DirectoryEntry object against the JSON schema
 * @param data - The data to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validateDirectoryEntry(data: unknown): ValidationResult {
  const valid = validateSchema(data);

  if (valid) {
    return {
      valid: true,
      data: data as unknown as DirectoryEntry,
    };
  }

  return {
    valid: false,
    errors: validateSchema.errors || [],
  };
}

/**
 * Validates a DirectoryEntry and throws an error if invalid
 * @param data - The data to validate
 * @returns The validated DirectoryEntry
 * @throws Error if validation fails
 */
export function validateDirectoryEntryStrict(data: unknown): DirectoryEntry {
  const result = validateDirectoryEntry(data);

  if (!result.valid) {
    const errorMessages =
      result.errors
        ?.map((err) => `${err.instancePath || "root"}: ${err.message}`)
        .join(", ") || "Unknown validation error";

    throw new Error(`DirectoryEntry validation failed: ${errorMessages}`);
  }

  return result.data!;
}
