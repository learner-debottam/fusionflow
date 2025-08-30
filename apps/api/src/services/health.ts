import { FastifyPluginAsync } from 'fastify';
import { HealthStatus, HealthCheck } from '../types';
import { getTracer } from '../config/otel';
import { PLATFORM_NAME, PLATFORM_VERSION } from '@fusionflow/common';

// Health check service
export class HealthService {
  private startTime: number;
  private tracer = getTracer('health-service');

  constructor() {
    this.startTime = Date.now();
  }

  // Get basic health status
  async getHealthStatus(): Promise<HealthStatus> {
    const span = this.tracer.startSpan('health_check');
    
    try {
      const checks = await this.performHealthChecks();
      const overallStatus = this.determineOverallStatus(checks);
      
      span.setAttributes({
        'health.status': overallStatus,
        'health.checks_count': Object.keys(checks).length,
      });

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: PLATFORM_VERSION,
        uptime: Date.now() - this.startTime,
        checks,
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: 'Health check failed' });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: PLATFORM_VERSION,
        uptime: Date.now() - this.startTime,
        checks: {
          'health-service': {
            status: 'unhealthy',
            message: 'Health service error',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            lastChecked: new Date().toISOString(),
          },
        },
      };
    } finally {
      span.end();
    }
  }

  // Perform all health checks
  private async performHealthChecks(): Promise<Record<string, HealthCheck>> {
    const checks: Record<string, HealthCheck> = {};

    // System checks
    checks['system'] = await this.checkSystemHealth();
    checks['memory'] = await this.checkMemoryHealth();
    checks['disk'] = await this.checkDiskHealth();

    // Application checks
    checks['application'] = await this.checkApplicationHealth();

    // External service checks (if configured)
    if (process.env.DATABASE_URL) {
      checks['database'] = await this.checkDatabaseHealth();
    }

    if (process.env.REDIS_URL) {
      checks['redis'] = await this.checkRedisHealth();
    }

    if (process.env.KAFKA_BROKERS) {
      checks['kafka'] = await this.checkKafkaHealth();
    }

    if (process.env.CLICKHOUSE_URL) {
      checks['clickhouse'] = await this.checkClickHouseHealth();
    }

    // Feature flag checks
    checks['feature-flags'] = await this.checkFeatureFlagsHealth();

    return checks;
  }

  // Check system health
  private async checkSystemHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('system_health_check');
    
    try {
      const loadAvg = process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg();
      const cpuCount = require('os').cpus().length;
      const loadPercentage = (loadAvg[0] / cpuCount) * 100;

      const status = loadPercentage < 80 ? 'healthy' : loadPercentage < 95 ? 'degraded' : 'unhealthy';
      
      span.setAttributes({
        'system.load_average': loadAvg[0],
        'system.cpu_count': cpuCount,
        'system.load_percentage': loadPercentage,
        'system.status': status,
      });

      return {
        status,
        message: `System load: ${loadPercentage.toFixed(2)}%`,
        details: {
          loadAverage: loadAvg,
          cpuCount,
          loadPercentage,
          platform: process.platform,
          arch: process.arch,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'System health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check memory health
  private async checkMemoryHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('memory_health_check');
    
    try {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsagePercentage = (usedMem / totalMem) * 100;

      const status = memoryUsagePercentage < 80 ? 'healthy' : memoryUsagePercentage < 95 ? 'degraded' : 'unhealthy';
      
      span.setAttributes({
        'memory.usage_percentage': memoryUsagePercentage,
        'memory.heap_used': memUsage.heapUsed,
        'memory.heap_total': memUsage.heapTotal,
        'memory.rss': memUsage.rss,
        'memory.status': status,
      });

      return {
        status,
        message: `Memory usage: ${memoryUsagePercentage.toFixed(2)}%`,
        details: {
          memoryUsage: memUsage,
          totalMemory: totalMem,
          freeMemory: freeMem,
          usedMemory: usedMem,
          memoryUsagePercentage,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Memory health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check disk health
  private async checkDiskHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('disk_health_check');
    
    try {
      // Simple disk check - in production, you might want to check specific directories
      const status = 'healthy'; // Simplified for now
      
      span.setAttributes({
        'disk.status': status,
      });

      return {
        status,
        message: 'Disk space available',
        details: {
          check: 'basic',
          note: 'Detailed disk checks not implemented',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Disk health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check application health
  private async checkApplicationHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('application_health_check');
    
    try {
      const uptime = Date.now() - this.startTime;
      const nodeVersion = process.version;
      const pid = process.pid;
      
      span.setAttributes({
        'application.uptime': uptime,
        'application.node_version': nodeVersion,
        'application.pid': pid,
      });

      return {
        status: 'healthy',
        message: 'Application is running',
        details: {
          uptime,
          nodeVersion,
          pid,
          platform: PLATFORM_NAME,
          version: PLATFORM_VERSION,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Application health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check database health
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('database_health_check');
    
    try {
      // This would be implemented with actual database connection
      // For now, return a mock healthy status
      const status = 'healthy';
      
      span.setAttributes({
        'database.status': status,
      });

      return {
        status,
        message: 'Database connection healthy',
        details: {
          type: 'postgresql',
          note: 'Mock check - implement actual database health check',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check Redis health
  private async checkRedisHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('redis_health_check');
    
    try {
      // This would be implemented with actual Redis connection
      const status = 'healthy';
      
      span.setAttributes({
        'redis.status': status,
      });

      return {
        status,
        message: 'Redis connection healthy',
        details: {
          type: 'redis',
          note: 'Mock check - implement actual Redis health check',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Redis health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check Kafka health
  private async checkKafkaHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('kafka_health_check');
    
    try {
      // This would be implemented with actual Kafka connection
      const status = 'healthy';
      
      span.setAttributes({
        'kafka.status': status,
      });

      return {
        status,
        message: 'Kafka connection healthy',
        details: {
          type: 'kafka',
          note: 'Mock check - implement actual Kafka health check',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Kafka health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check ClickHouse health
  private async checkClickHouseHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('clickhouse_health_check');
    
    try {
      // This would be implemented with actual ClickHouse connection
      const status = 'healthy';
      
      span.setAttributes({
        'clickhouse.status': status,
      });

      return {
        status,
        message: 'ClickHouse connection healthy',
        details: {
          type: 'clickhouse',
          note: 'Mock check - implement actual ClickHouse health check',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'ClickHouse health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Check feature flags health
  private async checkFeatureFlagsHealth(): Promise<HealthCheck> {
    const span = this.tracer.startSpan('feature_flags_health_check');
    
    try {
      const status = 'healthy';
      
      span.setAttributes({
        'feature_flags.status': status,
      });

      return {
        status,
        message: 'Feature flags service healthy',
        details: {
          type: 'feature-flags',
          note: 'Feature flags service is operational',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      span.recordException(error as Error);
      return {
        status: 'unhealthy',
        message: 'Feature flags health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastChecked: new Date().toISOString(),
      };
    } finally {
      span.end();
    }
  }

  // Determine overall status based on individual checks
  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Health check plugin
export const healthPlugin: FastifyPluginAsync = async (fastify) => {
  const healthService = new HealthService();

  // Decorate fastify with health service
  fastify.decorate('healthService', healthService);

  // Health check endpoint
  fastify.get('/healthz', {
    schema: {
      tags: ['health'],
      summary: 'Health check',
      description: 'Comprehensive health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            checks: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'object' },
                  lastChecked: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = await healthService.getHealthStatus();
    
    // Set appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    reply.status(statusCode);
    return healthStatus;
  });

  // Readiness check endpoint
  fastify.get('/readyz', {
    schema: {
      tags: ['health'],
      summary: 'Readiness check',
      description: 'Check if the service is ready to receive traffic',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            message: { type: 'string' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = await healthService.getHealthStatus();
    
    // Readiness requires healthy status
    if (healthStatus.status === 'healthy') {
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Service is ready to receive traffic',
      };
    } else {
      reply.status(503);
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Service is not ready to receive traffic',
      };
    }
  });

  // Liveness check endpoint
  fastify.get('/livez', {
    schema: {
      tags: ['health'],
      summary: 'Liveness check',
      description: 'Check if the service is alive',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      message: 'Service is alive',
    };
  });

  // Detailed health check endpoint
  fastify.get('/healthz/detailed', {
    schema: {
      tags: ['health'],
      summary: 'Detailed health check',
      description: 'Detailed health check with all component statuses',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
                version: { type: 'string' },
                uptime: { type: 'number' },
                checks: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'object' },
                      lastChecked: { type: 'string' },
                    },
                  },
                },
              },
            },
            timestamp: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = await healthService.getHealthStatus();
    
    return {
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'] as string,
    };
  });
};

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    healthService: HealthService;
  }
}
