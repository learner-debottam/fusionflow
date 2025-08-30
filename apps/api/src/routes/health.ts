import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HTTP_STATUS } from '@fusionflow/common';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  });

  // Liveness probe
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });

  // Readiness probe
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if the application is ready to serve requests
    // This could include database connectivity, external service health, etc.
    const checks = {
      database: true, // TODO: Implement actual database health check
      externalServices: true, // TODO: Implement external service health checks
    };

    const isReady = Object.values(checks).every(check => check === true);

    if (!isReady) {
      reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE);
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks,
      };
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Detailed health check
  fastify.get('/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'healthy',
          responseTime: 5, // TODO: Implement actual response time measurement
        },
        redis: {
          status: 'healthy',
          responseTime: 2, // TODO: Implement actual response time measurement
        },
        externalServices: {
          status: 'healthy',
          services: {
            // TODO: Add actual external service health checks
          },
        },
      },
    };

    return health;
  });
} 