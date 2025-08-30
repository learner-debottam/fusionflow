// Platform constants
export const PLATFORM_NAME = 'FusionFlow';
export const PLATFORM_VERSION = '0.1.0';

// API constants
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Validation constants
export const VALIDATION = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_METADATA_KEYS: 50,
  MAX_METADATA_VALUE_LENGTH: 1000,
} as const;

// Security constants
export const SECURITY = {
  JWT_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  API_KEY_PREFIX: 'ff_',
  API_KEY_LENGTH: 32,
} as const;

// OpenTelemetry constants
export const OTEL = {
  SERVICE_NAME: 'fusionflow',
  DEFAULT_SAMPLING_RATE: 1.0,
  DEFAULT_EXPORT_TIMEOUT: 30000,
  DEFAULT_BATCH_SIZE: 512,
  DEFAULT_BATCH_TIMEOUT: 5000,
} as const;

// Database constants
export const DATABASE = {
  DEFAULT_TIMEOUT: 30000,
  MAX_CONNECTIONS: 20,
  MIN_CONNECTIONS: 2,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 10000,
} as const;

// Cache constants
export const CACHE = {
  DEFAULT_TTL: 3600, // 1 hour
  MAX_TTL: 86400, // 24 hours
  DEFAULT_MAX_SIZE: 1000,
} as const;

// Queue constants
export const QUEUE = {
  DEFAULT_PRIORITY: 0,
  MAX_PRIORITY: 10,
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;

// File upload constants
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/json',
    'application/xml',
    'text/plain',
    'text/csv',
    'application/zip',
  ],
  MAX_FILES_PER_REQUEST: 10,
} as const;

// Rate limiting constants
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false,
  SKIP_FAILED_REQUESTS: false,
} as const;

// Logging constants
export const LOGGING = {
  DEFAULT_LEVEL: 'info',
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5,
  LOG_FORMAT: 'json',
} as const;

// Environment constants
export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

// Event types
export const EVENT_TYPES = {
  FLOW_CREATED: 'flow.created',
  FLOW_UPDATED: 'flow.updated',
  FLOW_DELETED: 'flow.deleted',
  FLOW_EXECUTED: 'flow.executed',
  CONNECTOR_CREATED: 'connector.created',
  CONNECTOR_UPDATED: 'connector.updated',
  CONNECTOR_DELETED: 'connector.deleted',
  CONNECTOR_CONNECTED: 'connector.connected',
  CONNECTOR_DISCONNECTED: 'connector.disconnected',
  EXECUTION_STARTED: 'execution.started',
  EXECUTION_COMPLETED: 'execution.completed',
  EXECUTION_FAILED: 'execution.failed',
} as const;

// Metric names
export const METRICS = {
  FLOW_EXECUTIONS_TOTAL: 'fusionflow_flow_executions_total',
  FLOW_EXECUTION_DURATION: 'fusionflow_flow_execution_duration_seconds',
  CONNECTOR_REQUESTS_TOTAL: 'fusionflow_connector_requests_total',
  CONNECTOR_REQUEST_DURATION: 'fusionflow_connector_request_duration_seconds',
  API_REQUESTS_TOTAL: 'fusionflow_api_requests_total',
  API_REQUEST_DURATION: 'fusionflow_api_request_duration_seconds',
  ACTIVE_CONNECTIONS: 'fusionflow_active_connections',
  QUEUE_SIZE: 'fusionflow_queue_size',
} as const; 