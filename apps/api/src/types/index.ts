import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Core API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  correlationId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication types
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  tenant?: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: AuthenticatedUser;
  token: string;
  isAuthenticated: boolean;
}

// Request context types
export interface RequestContext {
  correlationId: string;
  startTime: number;
  user?: AuthenticatedUser;
  traceId?: string;
  spanId?: string;
}

// Feature flags
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  dependencies?: string[];
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
  lastChecked: string;
}

// Error types
export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;
  correlationId?: string;
}

// Dependency injection container
export interface ServiceContainer {
  // Core services
  logger: any;
  tracer: any;
  metrics: any;
  
  // External services
  database: any;
  redis: any;
  kafka: any;
  clickhouse: any;
  
  // Business services
  authService: any;
  featureFlagService: any;
  healthService: any;
  
  // Utilities
  cache: any;
  validator: any;
}

// Request/Response schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const CorrelationIdSchema = z.object({
  'x-correlation-id': z.string().optional(),
});

export const AuthHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+/).optional(),
});

// Extended Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
    context?: RequestContext;
    user?: AuthenticatedUser;
    correlationId?: string;
  }
  
  interface FastifyReply {
    correlationId?: string;
  }
}

// CQRS types
export interface Command {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

export interface Query {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

export interface Event {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
  timestamp: string;
  correlationId: string;
}

export interface CommandHandler<T extends Command = Command> {
  handle(command: T): Promise<any>;
}

export interface QueryHandler<T extends Query = Query> {
  handle(query: T): Promise<any>;
}

export interface EventHandler<T extends Event = Event> {
  handle(event: T): Promise<void>;
}

// Middleware types
export interface Middleware {
  name: string;
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  options?: Record<string, any>;
}

// Plugin types
export interface Plugin {
  name: string;
  register: (fastify: any, options?: any) => Promise<void>;
  options?: Record<string, any>;
}
