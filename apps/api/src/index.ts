import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { API_PREFIX, HTTP_STATUS, PLATFORM_NAME, PLATFORM_VERSION } from '@fusionflow/common';

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
import { healthRoutes } from './routes/health';
import { connectorRoutes } from './routes/connectors';
import { flowRoutes } from './routes/flows';
import { executionRoutes } from './routes/executions';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function createServer() {

  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
    trustProxy: true,
  });

  // Security middleware
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
    allowList: process.env.RATE_LIMIT_ALLOWLIST?.split(',') || [],
  });

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: `${PLATFORM_NAME} API`,
        description: 'Next-gen middleware integration platform API',
        version: PLATFORM_VERSION,
      },
      host: `${HOST}:${PORT}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'connectors', description: 'Connector management' },
        { name: 'flows', description: 'Flow management' },
        { name: 'executions', description: 'Flow execution' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Request tracing middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    request.startTime = startTime;

    // Add correlation ID if not present
    if (!request.headers['x-correlation-id']) {
      request.headers['x-correlation-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    fastify.log.info({
      msg: 'Incoming request',
      method: request.method,
      url: request.url,
      correlationId: request.headers['x-correlation-id'],
      userAgent: request.headers['user-agent'],
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    
    fastify.log.info({
      msg: 'Request completed',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      correlationId: request.headers['x-correlation-id'],
    });

    // TODO: Record API metrics when OpenTelemetry is properly integrated
  });

  // Error handling
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({
      msg: 'Request error',
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
      correlationId: request.headers['x-correlation-id'],
    });

    // Don't expose internal errors in production
    const isInternalError = (error.statusCode || 500) >= 500;
    const message = isInternalError && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message;

    reply.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'],
    });
  });

  // Register routes
  await fastify.register(healthRoutes, { prefix: `${API_PREFIX}/health` });
  await fastify.register(connectorRoutes, { prefix: `${API_PREFIX}/connectors` });
  await fastify.register(flowRoutes, { prefix: `${API_PREFIX}/flows` });
  await fastify.register(executionRoutes, { prefix: `${API_PREFIX}/executions` });

  // Root endpoint
  fastify.get('/', async (request, reply) => {
    return {
      name: PLATFORM_NAME,
      version: PLATFORM_VERSION,
      status: 'running',
      timestamp: new Date().toISOString(),
      documentation: '/docs',
    };
  });

  return fastify;
}

async function start() {
  try {
    const server = await createServer();
    
    await server.listen({ port: PORT, host: HOST });
    
    console.log(`🚀 ${PLATFORM_NAME} API server running on http://${HOST}:${PORT}`);
    console.log(`📚 API documentation available at http://${HOST}:${PORT}/docs`);
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await server.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { createServer }; 