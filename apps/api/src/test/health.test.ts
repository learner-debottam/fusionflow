import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index';
import { testUtils } from './setup';

describe('Health Check Endpoints', () => {
  let server: any;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /healthz', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/healthz',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: expect.any(Object),
      });
    });

    it('should include all required health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/healthz',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      const data = response.json();
      expect(data.checks).toHaveProperty('system');
      expect(data.checks).toHaveProperty('memory');
      expect(data.checks).toHaveProperty('disk');
      expect(data.checks).toHaveProperty('application');
      expect(data.checks).toHaveProperty('feature-flags');
    });

    it('should return 503 for unhealthy status', async () => {
      // Mock unhealthy status by temporarily modifying the health service
      const originalGetHealthStatus = server.healthService.getHealthStatus;
      server.healthService.getHealthStatus = async () => ({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        uptime: 0,
        checks: {
          'test': {
            status: 'unhealthy',
            message: 'Test unhealthy',
            lastChecked: new Date().toISOString(),
          },
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/healthz',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(503);

      // Restore original method
      server.healthService.getHealthStatus = originalGetHealthStatus;
    });
  });

  describe('GET /readyz', () => {
    it('should return ready status when healthy', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/readyz',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
        message: 'Service is ready to receive traffic',
      });
    });

    it('should return 503 when not ready', async () => {
      // Mock unhealthy status
      const originalGetHealthStatus = server.healthService.getHealthStatus;
      server.healthService.getHealthStatus = async () => ({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        uptime: 0,
        checks: {},
      });

      const response = await server.inject({
        method: 'GET',
        url: '/readyz',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        status: 'not_ready',
        timestamp: expect.any(String),
        message: 'Service is not ready to receive traffic',
      });

      // Restore original method
      server.healthService.getHealthStatus = originalGetHealthStatus;
    });
  });

  describe('GET /livez', () => {
    it('should return alive status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/livez',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        message: 'Service is alive',
      });
    });
  });

  describe('GET /healthz/detailed', () => {
    it('should return detailed health status with API response format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/healthz/detailed',
        headers: {
          'x-correlation-id': testUtils.generateCorrelationId(),
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          timestamp: expect.any(String),
          version: expect.any(String),
          uptime: expect.any(Number),
          checks: expect.any(Object),
        },
        timestamp: expect.any(String),
        correlationId: expect.any(String),
      });
    });
  });
});

describe('Health Service', () => {
  let server: any;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('getHealthStatus', () => {
    it('should return valid health status', async () => {
      const healthStatus = await server.healthService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: expect.any(Object),
      });
    });

    it('should include system health check', async () => {
      const healthStatus = await server.healthService.getHealthStatus();
      
      expect(healthStatus.checks.system).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        message: expect.any(String),
        details: expect.any(Object),
        lastChecked: expect.any(String),
      });
    });

    it('should include memory health check', async () => {
      const healthStatus = await server.healthService.getHealthStatus();
      
      expect(healthStatus.checks.memory).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        message: expect.any(String),
        details: expect.any(Object),
        lastChecked: expect.any(String),
      });
    });

    it('should include application health check', async () => {
      const healthStatus = await server.healthService.getHealthStatus();
      
      expect(healthStatus.checks.application).toMatchObject({
        status: 'healthy',
        message: 'Application is running',
        details: expect.objectContaining({
          uptime: expect.any(Number),
          nodeVersion: expect.any(String),
          pid: expect.any(Number),
        }),
        lastChecked: expect.any(String),
      });
    });
  });

  describe('Health check error handling', () => {
    it('should handle health check failures gracefully', async () => {
      // Mock a failing health check
      const originalCheckSystemHealth = server.healthService['checkSystemHealth'];
      server.healthService['checkSystemHealth'] = async () => {
        throw new Error('System check failed');
      };

      const healthStatus = await server.healthService.getHealthStatus();

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.checks.system.status).toBe('unhealthy');
      expect(healthStatus.checks.system.message).toBe('System health check failed');

      // Restore original method
      server.healthService['checkSystemHealth'] = originalCheckSystemHealth;
    });
  });
});
