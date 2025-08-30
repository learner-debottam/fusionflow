import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Disable OpenTelemetry in tests
process.env.OTEL_TRACES_ENABLED = 'false';
process.env.OTEL_METRICS_ENABLED = 'false';

// Test database configuration
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/fusionflow_test';

// Test Redis configuration
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Test Kafka configuration
process.env.KAFKA_BROKERS = process.env.TEST_KAFKA_BROKERS || 'localhost:9092';

// Test ClickHouse configuration
process.env.CLICKHOUSE_URL = process.env.TEST_CLICKHOUSE_URL || 'http://localhost:8123';

// Disable rate limiting in tests
process.env.RATE_LIMIT_MAX = '10000';

// Test JWT configuration
process.env.JWT_SECRET = 'test-secret-key';
process.env.KEYCLOAK_JWKS_URI = 'http://localhost:8080/realms/master/protocol/openid-connect/certs';
process.env.KEYCLOAK_ISSUER = 'http://localhost:8080/realms/master';
process.env.KEYCLOAK_AUDIENCE = 'fusionflow-api';

// Enable all feature flags for testing
process.env.FEATURE_API_V2 = 'true';
process.env.FEATURE_ADVANCED_AUTH = 'true';
process.env.FEATURE_REAL_TIME_EXECUTIONS = 'true';
process.env.FEATURE_FLOW_SIMULATION = 'true';
process.env.FEATURE_ADVANCED_CONNECTORS = 'true';
process.env.FEATURE_AUDIT_LOGGING = 'true';
process.env.FEATURE_PERFORMANCE_MONITORING = 'true';

// Global test setup
beforeAll(async () => {
  // Add any global test setup here
  console.log('🧪 Setting up test environment...');
});

// Global test cleanup
afterAll(async () => {
  // Add any global test cleanup here
  console.log('🧹 Cleaning up test environment...');
});

// Test utilities
export const testUtils = {
  // Generate test correlation ID
  generateCorrelationId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate test JWT token
  generateTestToken: (payload: any = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      realm_access: { roles: ['user'] },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'http://localhost:8080/realms/master',
      aud: 'fusionflow-api',
      ...payload,
    };
    
    return jwt.sign(defaultPayload, process.env.JWT_SECRET, { algorithm: 'HS256' });
  },
  
  // Generate test admin token
  generateAdminToken: () => {
    return testUtils.generateTestToken({
      sub: 'admin-user-id',
      email: 'admin@example.com',
      realm_access: { roles: ['admin'] },
    });
  },
  
  // Wait for a specified time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock external services
  mockExternalServices: () => {
    // Mock database
    jest.mock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        }),
        end: jest.fn().mockResolvedValue(undefined),
      })),
    }));
    
    // Mock Redis
    jest.mock('redis', () => ({
      createClient: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(0),
      })),
    }));
    
    // Mock Kafka
    jest.mock('kafkajs', () => ({
      Kafka: jest.fn().mockImplementation(() => ({
        producer: jest.fn().mockReturnValue({
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          send: jest.fn().mockResolvedValue([]),
        }),
        consumer: jest.fn().mockReturnValue({
          connect: jest.fn().mockResolvedValue(undefined),
          disconnect: jest.fn().mockResolvedValue(undefined),
          subscribe: jest.fn().mockResolvedValue(undefined),
          run: jest.fn().mockResolvedValue(undefined),
        }),
      })),
    }));
  },
};
