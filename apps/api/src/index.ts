import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';
import formbody from '@fastify/formbody';
import urlData from '@fastify/url-data';
import requestContext from '@fastify/request-context';


import { API_PREFIX, HTTP_STATUS, PLATFORM_NAME, PLATFORM_VERSION } from '@fusionflow/common';

// Import configurations and middleware
import { initializeOpenTelemetry, getDefaultConfig as getOtelConfig } from './config/otel';
import { authMiddleware, requirePermissions } from './middleware/auth';
import { errorHandler } from './middleware/errors';
import { healthPlugin } from './services/health';
import { featureFlagsPlugin } from './services/featureFlags';

// Import route modules
import { healthRoutes } from './routes/health';
import { connectorRoutes } from './routes/connectors';
import { flowRoutes } from './routes/flows';
import { executionRoutes } from './routes/executions';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize OpenTelemetry
const otelConfig = getOtelConfig();
const otelSdk = initializeOpenTelemetry(otelConfig);

async function createServer() {
  // Create Fastify instance with structured logging
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          correlationId: req.headers['x-correlation-id'],
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });



  // Security middleware
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-API-Version',
    ],
    exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-*'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
    allowList: process.env.RATE_LIMIT_ALLOWLIST?.split(',') || [],
    keyGenerator: (request) => {
      return request.user?.id || request.ip;
    },
    errorResponseBuilder: (request, context) => ({
      type: 'https://fusionflow.com/errors/rate-limit',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: `Rate limit exceeded, retry in ${context.after}`,
      instance: request.url,
      correlationId: request.headers['x-correlation-id'] as string,
      timestamp: new Date().toISOString(),
    }),
  });

  // Compression
  await fastify.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
  });

  // Multipart support
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 10,
    },
  });

  // Form body parsing
  await fastify.register(formbody);

  // URL data parsing
  await fastify.register(urlData);

  // Request context
  await fastify.register(requestContext);

  // Error handling middleware
  await fastify.register(errorHandler);

  // Authentication middleware
  await fastify.register(authMiddleware);

  // Feature flags service
  await fastify.register(featureFlagsPlugin);

  // Health check service
  await fastify.register(healthPlugin);

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: `${PLATFORM_NAME} API`,
        description: 'Next-gen middleware integration platform API',
        version: PLATFORM_VERSION,
        contact: {
          name: 'FusionFlow Support',
          email: 'support@fusionflow.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      host: `${HOST}:${PORT}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'feature-flags', description: 'Feature flag management' },
        { name: 'connectors', description: 'Connector management' },
        { name: 'flows', description: 'Flow management' },
        { name: 'executions', description: 'Flow execution' },
      ],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Bearer token for authentication',
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayOperationId: false,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Request tracing and logging middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    request.startTime = startTime;

    // Generate correlation ID if not present
    if (!request.headers['x-correlation-id']) {
      request.headers['x-correlation-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Set correlation ID in reply
    reply.correlationId = request.headers['x-correlation-id'] as string;

    // Set request context
    request.context = {
      correlationId: request.headers['x-correlation-id'] as string,
      startTime,
    };

    // Log incoming request
    fastify.log.info({
      msg: 'Incoming request',
      method: request.method,
      url: request.url,
      correlationId: request.headers['x-correlation-id'],
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.id,
    });
  });

  // Response logging middleware
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    
    // Log response
    fastify.log.info({
      msg: 'Request completed',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      correlationId: request.headers['x-correlation-id'],
      userId: request.user?.id,
    });

    // Add response headers
    reply.header('X-Response-Time', `${duration}ms`);
    reply.header('X-Correlation-ID', request.headers['x-correlation-id']);
  });

  // Register API routes
  await fastify.register(healthRoutes, { prefix: `${API_PREFIX}/health` });
  await fastify.register(connectorRoutes, { prefix: `${API_PREFIX}/connectors` });
  await fastify.register(flowRoutes, { prefix: `${API_PREFIX}/flows` });
  await fastify.register(executionRoutes, { prefix: `${API_PREFIX}/executions` });

  // Root endpoint
  fastify.get('/', {
    schema: {
      tags: ['root'],
      summary: 'API Root',
      description: 'Get API information and available endpoints',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
            documentation: { type: 'string' },
            environment: { type: 'string' },
            features: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Get feature flags for the current user
    const userId = request.user?.id;
    const features = await fastify.isFeatureEnabled('api-v2', { userId }) ? {
      'api-v2': true,
      'advanced-auth': await fastify.isFeatureEnabled('advanced-auth', { userId }),
      'real-time-executions': await fastify.isFeatureEnabled('real-time-executions', { userId }),
      'flow-simulation': await fastify.isFeatureEnabled('flow-simulation', { userId }),
    } : {};

    return {
      name: PLATFORM_NAME,
      version: PLATFORM_VERSION,
      status: 'running',
      timestamp: new Date().toISOString(),
      documentation: '/docs',
      environment: NODE_ENV,
      features,
    };
  });

  // Version endpoint
  fastify.get('/version', {
    schema: {
      tags: ['root'],
      summary: 'API Version',
      description: 'Get API version information',
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            build: { type: 'string' },
            commit: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      version: PLATFORM_VERSION,
      build: process.env.BUILD_ID || 'dev',
      commit: process.env.GIT_COMMIT || 'unknown',
      timestamp: new Date().toISOString(),
    };
  });

  // OpenAPI JSON endpoint
  fastify.get('/openapi.json', {
    schema: {
      hide: true,
    },
  }, async (request, reply) => {
    return fastify.swagger();
  });

  // Metrics endpoint (if Prometheus is enabled)
  if (otelConfig.metricExporter === 'prometheus') {
    fastify.get('/metrics', {
      schema: {
        tags: ['monitoring'],
        summary: 'Prometheus Metrics',
        description: 'Get Prometheus metrics',
        hide: true,
      },
    }, async (request, reply) => {
      // This would return Prometheus metrics
      reply.header('Content-Type', 'text/plain');
      return '# Metrics endpoint - implement Prometheus metrics collection';
    });
  }

  return fastify;
}

async function start() {
  try {
    console.log(`🚀 Starting ${PLATFORM_NAME} API server...`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔧 OpenTelemetry: ${otelConfig.enableTraces ? 'enabled' : 'disabled'}`);
    
    const server = await createServer();
    
    await server.listen({ port: PORT, host: HOST });
    
    console.log(`✅ ${PLATFORM_NAME} API server running on http://${HOST}:${PORT}`);
    console.log(`📚 API documentation available at http://${HOST}:${PORT}/docs`);
    console.log(`🔍 Health check available at http://${HOST}:${PORT}/healthz`);
    console.log(`📊 OpenAPI spec available at http://${HOST}:${PORT}/openapi.json`);
    
    if (otelConfig.metricExporter === 'prometheus') {
      console.log(`📈 Metrics available at http://${HOST}:${PORT}/metrics`);
    }
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Close OpenTelemetry
        if (otelSdk) {
          await otelSdk.shutdown();
        }
        
        // Close server
        await server.close();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { createServer }; 