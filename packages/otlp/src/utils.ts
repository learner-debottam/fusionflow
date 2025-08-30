import { generateTraceId, generateSpanId, generateCorrelationId } from '@fusionflow/common';

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string {
  return generateTraceId();
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string {
  return generateSpanId();
}

/**
 * Get current correlation ID
 */
export function getCurrentCorrelationId(): string {
  return generateCorrelationId();
}

/**
 * Set correlation ID
 */
export function setCorrelationId(correlationId: string): void {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.log('Setting correlation ID:', correlationId);
}

/**
 * Add error to current span
 */
export function addErrorToSpan(error: Error): void {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.error('Error in span:', error.message);
}

/**
 * Add event to current span
 */
export function addEventToSpan(
  name: string,
  attributes?: Record<string, any>
): void {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.log('Event:', name, attributes);
}

/**
 * Set attribute on current span
 */
export function setSpanAttribute(
  key: string,
  value: string | number | boolean
): void {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.log('Setting attribute:', key, value);
}

/**
 * Set multiple attributes on current span
 */
export function setSpanAttributes(
  attributes: Record<string, string | number | boolean>
): void {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.log('Setting attributes:', attributes);
}

/**
 * Create a child span with automatic error handling
 */
export function createChildSpan<T>(
  name: string,
  attributes?: Record<string, any>,
  operation?: () => Promise<T>
): Promise<T> | any {
  // TODO: Implement when OpenTelemetry is properly integrated
  console.log('Creating child span:', name, attributes);
  
  if (!operation) {
    return {};
  }

  return operation();
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): {
  traceId?: string;
  spanId?: string;
  traceFlags?: number;
} {
  const traceparent = headers['traceparent'];
  if (!traceparent) {
    return {};
  }

  // Parse traceparent header (format: 00-<trace-id>-<span-id>-<trace-flags>)
  const parts = traceparent.split('-');
  if (parts.length !== 4) {
    return {};
  }

  return {
    traceId: parts[1],
    spanId: parts[2],
    traceFlags: parseInt(parts[3], 16),
  };
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(
  headers: Record<string, string> = {}
): Record<string, string> {
  // TODO: Implement when OpenTelemetry is properly integrated
  const traceId = getCurrentTraceId();
  const spanId = getCurrentSpanId();
  const traceparent = `00-${traceId}-${spanId}-01`;

  return {
    ...headers,
    traceparent,
    'x-correlation-id': getCurrentCorrelationId(),
  };
}

/**
 * Create span attributes for HTTP requests
 */
export function createHttpAttributes(
  method: string,
  url: string,
  statusCode?: number,
  userAgent?: string
): Record<string, any> {
  const attributes: Record<string, any> = {
    'http.method': method,
    'http.url': url,
  };

  if (statusCode) {
    attributes['http.status_code'] = statusCode;
  }

  if (userAgent) {
    attributes['http.user_agent'] = userAgent;
  }

  return attributes;
}

/**
 * Create span attributes for database operations
 */
export function createDatabaseAttributes(
  system: string,
  operation: string,
  table?: string,
  query?: string
): Record<string, any> {
  const attributes: Record<string, any> = {
    'db.system': system,
    'db.operation': operation,
  };

  if (table) {
    attributes['db.table'] = table;
  }

  if (query) {
    attributes['db.statement'] = query;
  }

  return attributes;
}

/**
 * Create span attributes for messaging operations
 */
export function createMessagingAttributes(
  system: string,
  operation: string,
  destination?: string,
  messageId?: string
): Record<string, any> {
  const attributes: Record<string, any> = {
    'messaging.system': system,
    'messaging.operation': operation,
  };

  if (destination) {
    attributes['messaging.destination'] = destination;
  }

  if (messageId) {
    attributes['messaging.message_id'] = messageId;
  }

  return attributes;
}

/**
 * Create span attributes for FusionFlow operations
 */
export function createFusionFlowAttributes(
  operation: string,
  flowId?: string,
  connectorId?: string,
  executionId?: string
): Record<string, any> {
  const attributes: Record<string, any> = {
    'fusionflow.operation': operation,
  };

  if (flowId) {
    attributes['fusionflow.flow.id'] = flowId;
  }

  if (connectorId) {
    attributes['fusionflow.connector.id'] = connectorId;
  }

  if (executionId) {
    attributes['fusionflow.execution.id'] = executionId;
  }

  return attributes;
} 