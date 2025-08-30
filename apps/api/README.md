# FusionFlow API

Enterprise-grade API server for the FusionFlow platform, built with Fastify, OpenTelemetry, and comprehensive observability.

## Features

- 🚀 **Fastify-based** with high performance and low overhead
- 🔐 **Keycloak JWT authentication** with role-based access control
- 📊 **OpenTelemetry integration** for distributed tracing and metrics
- 🏥 **Comprehensive health checks** with multiple endpoints
- 🚩 **Feature flags** with unleash-style interface
- 📚 **OpenAPI/Swagger documentation** with interactive UI
- 🛡️ **Security-first** with helmet, CORS, and rate limiting
- 🔄 **CQRS-ready** architecture with command/query separation
- 📝 **Structured logging** with correlation IDs
- 🧪 **Comprehensive testing** with Vitest and coverage
- 🐳 **Docker-ready** with complete development environment

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- pnpm (recommended) or npm

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd apps/api
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment:**
   ```bash
   # Start all services (PostgreSQL, Redis, Kafka, etc.)
   docker-compose up -d
   
   # Start the API server
   pnpm dev
   ```

4. **Access the services:**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs
   - Health Check: http://localhost:3000/healthz
   - Jaeger (Tracing): http://localhost:16686
   - Grafana (Metrics): http://localhost:3000 (admin/admin)
   - Keycloak: http://localhost:8080 (admin/admin)

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:ui

# Run specific test file
pnpm test health.test.ts
```

## API Endpoints

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/healthz

# Readiness check
curl http://localhost:3000/readyz

# Liveness check
curl http://localhost:3000/livez

# Detailed health check
curl http://localhost:3000/healthz/detailed
```

### Authentication

```bash
# Get JWT token from Keycloak
curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=fusionflow-api&username=admin&password=admin"

# Use token in API requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/connectors
```

### Feature Flags

```bash
# Get all feature flags
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/feature-flags

# Check specific feature flag
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context": {"tenant": "test"}}' \
  http://localhost:3000/api/v1/feature-flags/api-v2/check
```

## Architecture

### Core Components

- **Fastify Server**: High-performance web framework
- **OpenTelemetry**: Distributed tracing and metrics
- **Authentication**: Keycloak JWT with JWKS validation
- **Health Service**: Comprehensive health monitoring
- **Feature Flags**: Environment-backed feature management
- **Error Handling**: RFC7807 Problem Details compliance

### Directory Structure

```
src/
├── config/           # Configuration files
│   └── otel.ts      # OpenTelemetry configuration
├── middleware/       # Middleware components
│   ├── auth.ts      # Authentication middleware
│   └── errors.ts    # Error handling middleware
├── services/        # Business logic services
│   ├── health.ts    # Health check service
│   └── featureFlags.ts # Feature flags service
├── routes/          # API route handlers
│   ├── health.ts    # Health check routes
│   ├── connectors.ts # Connector management
│   ├── flows.ts     # Flow management
│   └── executions.ts # Execution management
├── types/           # TypeScript type definitions
│   └── index.ts     # Core types and interfaces
├── test/            # Test files
│   ├── setup.ts     # Test configuration
│   └── health.test.ts # Health check tests
└── index.ts         # Main application entry point
```

## Configuration

### Environment Variables

Key configuration options:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fusionflow

# Redis
REDIS_URL=redis://:password@localhost:6379/0

# Kafka
KAFKA_BROKERS=localhost:9092

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_TRACES_ENABLED=true
OTEL_METRICS_ENABLED=true

# Authentication
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/master/protocol/openid-connect/certs
KEYCLOAK_ISSUER=http://localhost:8080/realms/master
KEYCLOAK_AUDIENCE=fusionflow-api

# Feature Flags
FEATURE_API_V2=true
FEATURE_ADVANCED_AUTH=true
```

### Feature Flags

Feature flags are controlled via environment variables:

- `FEATURE_API_V2`: Enable API v2 endpoints
- `FEATURE_ADVANCED_AUTH`: Enable advanced authentication
- `FEATURE_REAL_TIME_EXECUTIONS`: Enable real-time monitoring
- `FEATURE_FLOW_SIMULATION`: Enable flow simulation
- `FEATURE_AI_ASSIST`: Enable AI-assisted features

## Development

### Adding New Routes

1. Create route file in `src/routes/`
2. Export route plugin
3. Register in `src/index.ts`

```typescript
// src/routes/example.ts
import { FastifyPluginAsync } from 'fastify';

export const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/example', {
    schema: {
      tags: ['example'],
      summary: 'Example endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return { message: 'Hello from example endpoint!' };
  });
};
```

### Adding New Services

1. Create service file in `src/services/`
2. Export service class and plugin
3. Register plugin in `src/index.ts`

```typescript
// src/services/example.ts
export class ExampleService {
  async doSomething() {
    // Service logic
  }
}

export const examplePlugin: FastifyPluginAsync = async (fastify) => {
  const service = new ExampleService();
  fastify.decorate('exampleService', service);
};
```

### Error Handling

Use the provided error classes:

```typescript
import { createError } from '../middleware/errors';

// In your route handler
if (!user) {
  throw createError.notFound('User not found', correlationId);
}

if (!permission) {
  throw createError.authorization('Insufficient permissions', correlationId);
}
```

## Testing

### Test Structure

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and services
- **E2E Tests**: Test complete workflows

### Running Tests

```bash
# All tests
pnpm test

# Specific test file
pnpm test health.test.ts

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:ui
```

### Test Utilities

```typescript
import { testUtils } from './test/setup';

// Generate test tokens
const token = testUtils.generateTestToken();
const adminToken = testUtils.generateAdminToken();

// Generate correlation IDs
const correlationId = testUtils.generateCorrelationId();
```

## Monitoring & Observability

### Health Checks

- `/healthz`: Comprehensive health status
- `/readyz`: Readiness for traffic
- `/livez`: Basic liveness check
- `/healthz/detailed`: Detailed health with API format

### Metrics

- Prometheus metrics at `/metrics`
- Custom business metrics
- Performance monitoring
- Resource utilization

### Tracing

- Distributed tracing with Jaeger
- Request correlation
- Performance profiling
- Error tracking

### Logging

- Structured JSON logging
- Correlation IDs
- Request/response logging
- Error logging with stack traces

## Security

### Authentication

- JWT tokens from Keycloak
- JWKS validation
- Role-based access control
- Token expiration handling

### Authorization

- Permission-based access control
- Resource-level permissions
- Tenant isolation (when enabled)

### Security Headers

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation

## Performance

### Optimization

- Fastify for high performance
- Response compression
- Connection pooling
- Caching strategies

### Monitoring

- Request duration tracking
- Memory usage monitoring
- Database query performance
- External service latency

## Deployment

### Docker

```bash
# Build image
docker build -t fusionflow-api .

# Run container
docker run -p 3000:3000 fusionflow-api
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Considerations

- Use environment-specific configurations
- Enable all security features
- Configure proper logging levels
- Set up monitoring and alerting
- Use secrets management
- Configure backup strategies

## Troubleshooting

### Common Issues

1. **Database Connection**: Check `DATABASE_URL` and network connectivity
2. **Redis Connection**: Verify Redis is running and accessible
3. **Authentication**: Ensure Keycloak is configured correctly
4. **Health Checks**: Check individual service health status
5. **Rate Limiting**: Verify rate limit configuration

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Enable OpenTelemetry console output
OTEL_TRACE_EXPORTER=console pnpm dev
```

### Logs

```bash
# View application logs
docker-compose logs -f api

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update documentation
4. Use conventional commits
5. Create feature branches

## License

MIT License - see LICENSE file for details.
