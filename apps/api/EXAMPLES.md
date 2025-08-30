# FusionFlow API Examples

This document provides comprehensive examples for testing and using the FusionFlow API.

## Prerequisites

1. Start the development environment:
   ```bash
   docker-compose up -d
   pnpm dev
   ```

2. Set up environment variables:
   ```bash
   cp env.example .env
   ```

## Health Check Examples

### Basic Health Check
```bash
curl -X GET http://localhost:3000/healthz \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 1234567,
  "checks": {
    "system": {
      "status": "healthy",
      "message": "System load: 15.23%",
      "details": {
        "loadAverage": [0.15, 0.12, 0.08],
        "cpuCount": 8,
        "loadPercentage": 15.23
      },
      "lastChecked": "2024-01-15T10:30:00.000Z"
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage: 45.67%",
      "details": {
        "memoryUsage": {
          "heapUsed": 123456789,
          "heapTotal": 234567890,
          "rss": 345678901
        },
        "memoryUsagePercentage": 45.67
      },
      "lastChecked": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Readiness Check
```bash
curl -X GET http://localhost:3000/readyz \
  -H "Content-Type: application/json"
```

### Liveness Check
```bash
curl -X GET http://localhost:3000/livez \
  -H "Content-Type: application/json"
```

### Detailed Health Check
```bash
curl -X GET http://localhost:3000/healthz/detailed \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-123"
```

## Authentication Examples

### Get JWT Token from Keycloak
```bash
curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=fusionflow-api&username=admin&password=admin"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "not-before-policy": 0,
  "session_state": "12345678-1234-1234-1234-123456789012",
  "scope": "openid email profile"
}
```

### Use Token in API Request
```bash
curl -X GET http://localhost:3000/api/v1/connectors \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Correlation-ID: test-456"
```

## Feature Flags Examples

### Get All Feature Flags
```bash
curl -X GET http://localhost:3000/api/v1/feature-flags \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Correlation-ID: test-789"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "api-v2",
      "enabled": true,
      "description": "Enable API v2 endpoints",
      "rolloutPercentage": 100,
      "dependencies": []
    },
    {
      "name": "advanced-auth",
      "enabled": true,
      "description": "Enable advanced authentication features",
      "rolloutPercentage": 50,
      "dependencies": []
    },
    {
      "name": "real-time-executions",
      "enabled": true,
      "description": "Enable real-time execution monitoring",
      "rolloutPercentage": 25,
      "dependencies": ["api-v2"]
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "test-789"
}
```

### Get Specific Feature Flag
```bash
curl -X GET http://localhost:3000/api/v1/feature-flags/api-v2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Correlation-ID: test-101"
```

### Check Feature Flag Status
```bash
curl -X POST http://localhost:3000/api/v1/feature-flags/api-v2/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-112" \
  -d '{
    "context": {
      "tenant": "acme-corp",
      "environment": "production",
      "attributes": {
        "user_type": "premium",
        "region": "us-east-1"
      }
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "flag": {
      "name": "api-v2",
      "enabled": true,
      "description": "Enable API v2 endpoints",
      "rolloutPercentage": 100
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "test-112"
}
```

## API Root Examples

### Get API Information
```bash
curl -X GET http://localhost:3000/ \
  -H "X-Correlation-ID: test-131"
```

**Response:**
```json
{
  "name": "FusionFlow",
  "version": "0.1.0",
  "status": "running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "documentation": "/docs",
  "environment": "development",
  "features": {
    "api-v2": true,
    "advanced-auth": true,
    "real-time-executions": false,
    "flow-simulation": true
  }
}
```

### Get API Version
```bash
curl -X GET http://localhost:3000/version \
  -H "X-Correlation-ID: test-141"
```

**Response:**
```json
{
  "version": "0.1.0",
  "build": "dev",
  "commit": "abc123def456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling Examples

### 404 Not Found
```bash
curl -X GET http://localhost:3000/api/v1/nonexistent \
  -H "X-Correlation-ID: test-151"
```

**Response:**
```json
{
  "type": "https://fusionflow.com/errors/not-found",
  "title": "Route Not Found",
  "status": 404,
  "detail": "Route GET /api/v1/nonexistent not found",
  "instance": "/api/v1/nonexistent",
  "correlationId": "test-151",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 401 Unauthorized
```bash
curl -X GET http://localhost:3000/api/v1/connectors \
  -H "X-Correlation-ID: test-161"
```

**Response:**
```json
{
  "type": "https://fusionflow.com/errors/authentication",
  "title": "Authentication Error",
  "status": 401,
  "detail": "Authorization header required",
  "instance": "/api/v1/connectors",
  "correlationId": "test-161",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 403 Forbidden
```bash
curl -X GET http://localhost:3000/api/v1/feature-flags \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "X-Correlation-ID: test-171"
```

**Response:**
```json
{
  "type": "https://fusionflow.com/errors/authorization",
  "title": "Authorization Error",
  "status": 403,
  "detail": "Insufficient permissions",
  "instance": "/api/v1/feature-flags",
  "correlationId": "test-171",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 429 Rate Limited
```bash
# Make many requests quickly to trigger rate limiting
for i in {1..150}; do
  curl -X GET http://localhost:3000/healthz \
    -H "X-Correlation-ID: test-$i"
done
```

**Response:**
```json
{
  "type": "https://fusionflow.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Rate limit exceeded, retry in 15 minutes",
  "instance": "/healthz",
  "correlationId": "test-150",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## OpenAPI Documentation

### Get OpenAPI Spec
```bash
curl -X GET http://localhost:3000/openapi.json \
  -H "X-Correlation-ID: test-181"
```

### Access Swagger UI
Open your browser and navigate to: http://localhost:3000/docs

## Monitoring Examples

### Get Prometheus Metrics
```bash
curl -X GET http://localhost:3000/metrics \
  -H "X-Correlation-ID: test-191"
```

**Response:**
```
# HELP fusionflow_api_requests_total Total number of API requests
# TYPE fusionflow_api_requests_total counter
fusionflow_api_requests_total{method="GET",path="/healthz",status="200"} 42

# HELP fusionflow_api_request_duration_seconds API request duration in seconds
# TYPE fusionflow_api_request_duration_seconds histogram
fusionflow_api_request_duration_seconds_bucket{method="GET",path="/healthz",le="0.1"} 40
fusionflow_api_request_duration_seconds_bucket{method="GET",path="/healthz",le="0.5"} 42
```

## Testing with Different User Roles

### Admin User
```bash
# Generate admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=fusionflow-api&username=admin&password=admin" | jq -r '.access_token')

# Use admin token
curl -X GET http://localhost:3000/api/v1/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Correlation-ID: admin-test"
```

### Regular User
```bash
# Generate user token
USER_TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=fusionflow-api&username=user&password=user" | jq -r '.access_token')

# Use user token
curl -X GET http://localhost:3000/api/v1/connectors \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Correlation-ID: user-test"
```

## Performance Testing

### Load Testing with Apache Bench
```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/healthz

# Test authenticated endpoint
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/feature-flags
```

### Load Testing with Artillery
```bash
# Install Artillery
npm install -g artillery

# Create test file: load-test.yml
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health Check"
    requests:
      - get:
          url: "/healthz"
          headers:
            X-Correlation-ID: "{{ $randomString() }}"
EOF

# Run load test
artillery run load-test.yml
```

## Troubleshooting Examples

### Check Service Health
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Enable OpenTelemetry console output
OTEL_TRACE_EXPORTER=console pnpm dev
```

### Test Database Connection
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U fusionflow -d fusionflow

# Test Redis connection
docker-compose exec redis redis-cli -a fusionflow ping
```

### Test Kafka Connection
```bash
# List Kafka topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create test topic
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 \
  --create --topic test-topic --partitions 1 --replication-factor 1
```

## Environment-Specific Examples

### Development Environment
```bash
# Start development environment
docker-compose -f docker-compose.yml up -d

# Run tests
pnpm test

# Start API with hot reload
pnpm dev
```

### Production Environment
```bash
# Build production image
docker build -t fusionflow-api:latest .

# Run with production environment
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@host:5432/fusionflow \
  -e REDIS_URL=redis://:pass@host:6379/0 \
  fusionflow-api:latest
```

## Security Testing Examples

### Test CORS
```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/v1/connectors \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

### Test Security Headers
```bash
# Check security headers
curl -I http://localhost:3000/healthz
```

**Response:**
```
HTTP/1.1 200 OK
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Correlation-ID: req_1705312200000_abc123def
X-Response-Time: 5ms
```

### Test Rate Limiting
```bash
# Test rate limiting
for i in {1..120}; do
  response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3000/healthz)
  echo "Request $i: $response"
  if [ "$response" = "429" ]; then
    echo "Rate limit hit at request $i"
    break
  fi
done
```

## Integration Examples

### Complete Workflow Test
```bash
#!/bin/bash

# 1. Check API health
echo "1. Checking API health..."
health_response=$(curl -s http://localhost:3000/healthz)
echo "Health status: $(echo $health_response | jq -r '.status')"

# 2. Get JWT token
echo "2. Getting JWT token..."
token_response=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=fusionflow-api&username=admin&password=admin")
token=$(echo $token_response | jq -r '.access_token')

if [ "$token" = "null" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token obtained successfully"

# 3. Test authenticated endpoint
echo "3. Testing authenticated endpoint..."
feature_flags_response=$(curl -s -H "Authorization: Bearer $token" \
  http://localhost:3000/api/v1/feature-flags)
echo "Feature flags count: $(echo $feature_flags_response | jq '.data | length')"

# 4. Test feature flag check
echo "4. Testing feature flag check..."
flag_check_response=$(curl -s -X POST \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"context": {"tenant": "test"}}' \
  http://localhost:3000/api/v1/feature-flags/api-v2/check)
echo "API v2 enabled: $(echo $flag_check_response | jq -r '.data.enabled')"

echo "Integration test completed successfully!"
```

This script provides a complete end-to-end test of the API functionality.

## Notes

- Replace `YOUR_JWT_TOKEN` with actual tokens obtained from Keycloak
- All examples use correlation IDs for tracing
- Error responses follow RFC7807 Problem Details format
- Health checks are available without authentication
- Feature flags require authentication and appropriate permissions
- Rate limiting is applied per user/IP
- All responses include correlation IDs for debugging
