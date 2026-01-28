/**
 * Centralized Error Handling
 * Provides consistent error responses across the API
 */

import { t } from "elysia";

// Error codes for client-side handling
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "DATABASE_ERROR"
  | "INVALID_URL"
  | "SCRAPE_FAILED"
  | "PLATFORM_ERROR"
  | "EMAIL_NOT_VERIFIED";

// Field-level errors for form validation
export type FieldErrors = Record<string, string>;

// Standard error response interface
export interface ErrorResponse {
  success: false;
  status: number;
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

// Elysia validation error shape
interface ElysiaValidationError {
  path?: string;
  message?: string;
  summary?: string;
  type?: number;
  schema?: unknown;
  value?: unknown;
  errors?: ElysiaValidationError[];
}

// TypeBox schema for OpenAPI documentation
export const ErrorResponseSchema = t.Object({
  success: t.Literal(false),
  status: t.Number(),
  code: t.String(),
  message: t.String(),
  fieldErrors: t.Optional(t.Record(t.String(), t.String())),
});

/**
 * Application Error class for consistent error handling
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly fieldErrors?: FieldErrors;

  constructor(
    code: ErrorCode,
    message: string,
    status?: number,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.code = code;
    this.status = status ?? this.getDefaultStatus(code);
    this.fieldErrors = fieldErrors;
    this.name = "AppError";
  }

  private getDefaultStatus(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      BAD_REQUEST: 400,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      DATABASE_ERROR: 500,
      INVALID_URL: 400,
      SCRAPE_FAILED: 400,
      PLATFORM_ERROR: 502,
      EMAIL_NOT_VERIFIED: 403,
    };
    return statusMap[code] ?? 500;
  }

  toResponse(): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      status: this.status,
      code: this.code,
      message: this.message,
    };
    if (this.fieldErrors && Object.keys(this.fieldErrors).length > 0) {
      response.fieldErrors = this.fieldErrors;
    }
    return response;
  }
}

/**
 * Parse Elysia/TypeBox validation errors into field-level errors
 */
export function parseValidationErrors(
  errors: ElysiaValidationError[],
): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const err of errors) {
    // Extract field name from path (e.g., "/title" -> "title")
    let field = err.path?.replace(/^\//, "") || "unknown";

    // Handle nested paths (e.g., "/body/title" -> "title")
    if (field.includes("/")) {
      const parts = field.split("/");
      field = parts[parts.length - 1] || field;
    }

    // Get the error message
    const message = err.summary || err.message || "Invalid value";

    // Only set if not already set (first error wins)
    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }

    // Recursively process nested errors (preserve first-error-wins)
    if (err.errors && Array.isArray(err.errors)) {
      const nestedErrors = parseValidationErrors(err.errors);
      // Only set nested errors if field doesn't already exist
      for (const [nestedField, nestedMessage] of Object.entries(nestedErrors)) {
        if (!fieldErrors[nestedField]) {
          fieldErrors[nestedField] = nestedMessage;
        }
      }
    }
  }

  return fieldErrors;
}

/**
 * Parse database errors into human-readable messages
 */
export function parseDbError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);

  // Foreign key constraint on resource_type
  if (
    message.includes("resource_type") &&
    message.includes("violates foreign key")
  ) {
    return new AppError("VALIDATION_ERROR", "Invalid resource type", 400, {
      resourceType: "Invalid resource type",
    });
  }

  // Unique constraint violation
  if (
    message.includes("unique constraint") ||
    message.includes("duplicate key")
  ) {
    if (message.includes("url")) {
      return new AppError(
        "CONFLICT",
        "A resource with this URL already exists",
        409,
        {
          url: "This URL already exists",
        },
      );
    }
    if (message.includes("email")) {
      return new AppError("CONFLICT", "This email is already registered", 409, {
        email: "Email already registered",
      });
    }
    if (message.includes("name")) {
      return new AppError("CONFLICT", "This name is already taken", 409, {
        name: "Name already taken",
      });
    }
    return new AppError("CONFLICT", "This resource already exists", 409);
  }

  // Not null violation
  if (
    message.includes("not-null constraint") ||
    message.includes("null value in column")
  ) {
    const match = message.match(/column "(\w+)"/);
    const column = match?.[1] ?? "required field";
    return new AppError(
      "VALIDATION_ERROR",
      `Missing required field: ${column}`,
      400,
      {
        [column]: "This field is required",
      },
    );
  }

  // Connection errors
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("connection refused") ||
    message.includes("connection timeout") ||
    message.includes("cannot connect")
  ) {
    return new AppError(
      "INTERNAL_ERROR",
      "Database connection failed. Please try again later.",
      503,
    );
  }

  // Default database error
  return new AppError(
    "DATABASE_ERROR",
    "An unexpected database error occurred",
    500,
  );
}

/**
 * Parse any error into an AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Check if it's an Elysia validation error (has 'all' property with array of errors)
  const errorObj = error as { all?: ElysiaValidationError[]; message?: string };
  if (errorObj.all && Array.isArray(errorObj.all)) {
    const fieldErrors = parseValidationErrors(errorObj.all);
    const message =
      Object.values(fieldErrors).length > 0
        ? Object.values(fieldErrors).join(", ")
        : "Validation failed";
    return new AppError("VALIDATION_ERROR", message, 400, fieldErrors);
  }

  // Check if it's a database error
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("violates") ||
    message.includes("constraint") ||
    message.includes("Failed query")
  ) {
    return parseDbError(error);
  }

  // Check for Elysia validation error by name or structure
  const errorWithName = error as {
    name?: string;
    type?: string;
    status?: number;
  };
  if (
    errorWithName.name === "ValidationError" ||
    errorWithName.type === "validation" ||
    (errorWithName.status === 400 && message.includes("Expected"))
  ) {
    return new AppError("VALIDATION_ERROR", message, 400);
  }

  // Generic error
  return new AppError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

/**
 * Create a standard error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status?: number,
  fieldErrors?: FieldErrors,
): ErrorResponse {
  const error = new AppError(code, message, status, fieldErrors);
  return error.toResponse();
}

/**
 * Create a validation error response with field errors
 */
export function validationError(
  message: string,
  fieldErrors: FieldErrors,
): ErrorResponse {
  return errorResponse("VALIDATION_ERROR", message, 400, fieldErrors);
}
