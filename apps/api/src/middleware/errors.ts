import { FastifyRequest, FastifyReply } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HTTP_STATUS, ERROR_CODES } from '@fusionflow/common';
import { ApiError } from '../types';

// Problem Details (RFC7807) interface
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

// Error mapping configuration
const ERROR_MAPPING = {
  // Validation errors
  [ERROR_CODES.VALIDATION_ERROR]: {
    status: HTTP_STATUS.BAD_REQUEST,
    title: 'Validation Error',
    type: 'https://fusionflow.com/errors/validation',
  },
  
  // Authentication errors
  [ERROR_CODES.AUTHENTICATION_ERROR]: {
    status: HTTP_STATUS.UNAUTHORIZED,
    title: 'Authentication Error',
    type: 'https://fusionflow.com/errors/authentication',
  },
  
  // Authorization errors
  [ERROR_CODES.AUTHORIZATION_ERROR]: {
    status: HTTP_STATUS.FORBIDDEN,
    title: 'Authorization Error',
    type: 'https://fusionflow.com/errors/authorization',
  },
  
  // Not found errors
  [ERROR_CODES.NOT_FOUND_ERROR]: {
    status: HTTP_STATUS.NOT_FOUND,
    title: 'Resource Not Found',
    type: 'https://fusionflow.com/errors/not-found',
  },
  
  // Conflict errors
  [ERROR_CODES.CONFLICT_ERROR]: {
    status: HTTP_STATUS.CONFLICT,
    title: 'Resource Conflict',
    type: 'https://fusionflow.com/errors/conflict',
  },
  
  // Internal errors
  [ERROR_CODES.INTERNAL_ERROR]: {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    title: 'Internal Server Error',
    type: 'https://fusionflow.com/errors/internal',
  },
  
  // External service errors
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: {
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    title: 'External Service Error',
    type: 'https://fusionflow.com/errors/external-service',
  },
  
  // Rate limit errors
  [ERROR_CODES.RATE_LIMIT_ERROR]: {
    status: 429,
    title: 'Rate Limit Exceeded',
    type: 'https://fusionflow.com/errors/rate-limit',
  },
  
  // Timeout errors
  [ERROR_CODES.TIMEOUT_ERROR]: {
    status: 408,
    title: 'Request Timeout',
    type: 'https://fusionflow.com/errors/timeout',
  },
};

// Create problem details from error
function createProblemDetails(
  error: Error | ApiError,
  request: FastifyRequest,
  statusCode?: number
): ProblemDetails {
  const correlationId = request.headers['x-correlation-id'] as string;
  const timestamp = new Date().toISOString();
  
  // Determine error code and status
  let errorCode = ERROR_CODES.INTERNAL_ERROR;
  let status = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  
  if ('code' in error && error.code) {
    errorCode = error.code as string;
  }
  
  if ('statusCode' in error && error.statusCode) {
    status = error.statusCode;
  }
  
  // Get error mapping
  const mapping = ERROR_MAPPING[errorCode] || ERROR_MAPPING[ERROR_CODES.INTERNAL_ERROR];
  
  // Create problem details
  const problemDetails: ProblemDetails = {
    type: mapping.type,
    title: mapping.title,
    status,
    detail: error.message,
    instance: request.url,
    correlationId,
    timestamp,
  };
  
  // Add validation errors if it's a Zod error
  if (error instanceof z.ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });
    problemDetails.errors = errors;
  }
  
  return problemDetails;
}

// Error handling middleware
export const errorHandler: FastifyPluginAsync = async (fastify) => {
  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string;
    
    // Log the error
    fastify.log.error({
      msg: 'Request error',
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
      correlationId,
      errorCode: 'code' in error ? error.code : undefined,
      statusCode: 'statusCode' in error ? error.statusCode : undefined,
    });

    // Create problem details
    const problemDetails = createProblemDetails(error, request);
    
    // Set appropriate headers
    reply.header('Content-Type', 'application/problem+json');
    reply.header('X-Correlation-ID', correlationId);
    
    // Don't expose internal errors in production
    const isInternalError = problemDetails.status >= 500;
    if (isInternalError && process.env.NODE_ENV === 'production') {
      problemDetails.detail = 'An internal server error occurred';
      problemDetails.errors = undefined; // Don't expose validation errors in production
    }
    
    // Send response
    reply.status(problemDetails.status).send(problemDetails);
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string;
    
    fastify.log.warn({
      msg: 'Route not found',
      method: request.method,
      url: request.url,
      correlationId,
    });

    const problemDetails: ProblemDetails = {
      type: ERROR_MAPPING[ERROR_CODES.NOT_FOUND_ERROR].type,
      title: 'Route Not Found',
      status: HTTP_STATUS.NOT_FOUND,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    reply.header('Content-Type', 'application/problem+json');
    reply.header('X-Correlation-ID', correlationId);
    reply.status(HTTP_STATUS.NOT_FOUND).send(problemDetails);
  });
};

// Custom error classes
export class ValidationError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.BAD_REQUEST;
  public readonly code = ERROR_CODES.VALIDATION_ERROR;
  public readonly details?: Record<string, any>;
  public readonly correlationId?: string;

  constructor(message: string, details?: Record<string, any>, correlationId?: string) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.correlationId = correlationId;
  }
}

export class AuthenticationError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.UNAUTHORIZED;
  public readonly code = ERROR_CODES.AUTHENTICATION_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.correlationId = correlationId;
  }
}

export class AuthorizationError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.FORBIDDEN;
  public readonly code = ERROR_CODES.AUTHORIZATION_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.correlationId = correlationId;
  }
}

export class NotFoundError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.NOT_FOUND;
  public readonly code = ERROR_CODES.NOT_FOUND_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.correlationId = correlationId;
  }
}

export class ConflictError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.CONFLICT;
  public readonly code = ERROR_CODES.CONFLICT_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'ConflictError';
    this.correlationId = correlationId;
  }
}

export class InternalError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  public readonly code = ERROR_CODES.INTERNAL_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'InternalError';
    this.correlationId = correlationId;
  }
}

export class ExternalServiceError extends Error implements ApiError {
  public readonly statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
  public readonly code = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.correlationId = correlationId;
  }
}

export class RateLimitError extends Error implements ApiError {
  public readonly statusCode = 429;
  public readonly code = ERROR_CODES.RATE_LIMIT_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'RateLimitError';
    this.correlationId = correlationId;
  }
}

export class TimeoutError extends Error implements ApiError {
  public readonly statusCode = 408;
  public readonly code = ERROR_CODES.TIMEOUT_ERROR;
  public readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = 'TimeoutError';
    this.correlationId = correlationId;
  }
}

// Error factory functions
export const createError = {
  validation: (message: string, details?: Record<string, any>, correlationId?: string) =>
    new ValidationError(message, details, correlationId),
  
  authentication: (message: string, correlationId?: string) =>
    new AuthenticationError(message, correlationId),
  
  authorization: (message: string, correlationId?: string) =>
    new AuthorizationError(message, correlationId),
  
  notFound: (message: string, correlationId?: string) =>
    new NotFoundError(message, correlationId),
  
  conflict: (message: string, correlationId?: string) =>
    new ConflictError(message, correlationId),
  
  internal: (message: string, correlationId?: string) =>
    new InternalError(message, correlationId),
  
  externalService: (message: string, correlationId?: string) =>
    new ExternalServiceError(message, correlationId),
  
  rateLimit: (message: string, correlationId?: string) =>
    new RateLimitError(message, correlationId),
  
  timeout: (message: string, correlationId?: string) =>
    new TimeoutError(message, correlationId),
};

// Zod error handler
export function handleZodError(error: z.ZodError, correlationId?: string): ValidationError {
  const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
  const message = messages.join(', ');
  
  const details: Record<string, any> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push({
      message: err.message,
      code: err.code,
    });
  });
  
  return createError.validation(message, details, correlationId);
}

// Async error wrapper
export function asyncHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw API errors
      }
      
      // Convert unknown errors to internal errors
      const correlationId = args[0]?.headers?.['x-correlation-id'];
      throw createError.internal(
        error instanceof Error ? error.message : 'Unknown error occurred',
        correlationId
      );
    }
  };
}
