# FusionFlow DSL (Domain Specific Language)

A comprehensive Domain Specific Language for defining data flows in FusionFlow with support for metadata, triggers, steps, transports, policies, and observability.

## Features

### 🏷️ Metadata Management
- **Flow Information**: Name, version, description, tags
- **Ownership**: Multiple owners with roles and teams
- **Compliance**: GDPR, HIPAA, SOC2, PCI compliance flags
- **RBAC**: Role-based access control with permissions
- **Tenant Support**: Multi-tenant architecture support

### 🔄 Triggers
- **HTTP**: REST API endpoints with authentication
- **Schedule**: Cron-based scheduling with timezone support
- **Kafka**: Message queue triggers with consumer groups
- **MQTT**: IoT device communication
- **SFTP**: File transfer triggers
- **JDBC**: Database change triggers
- **File Watch**: File system monitoring

### ⚙️ Steps
- **Connector**: External system integration
- **Map**: JSONata-based data transformation
- **Script**: JavaScript/Python code execution
- **Enrich**: Data enrichment from external sources
- **Branch**: Conditional routing based on expressions
- **Retry**: Configurable retry logic with backoff
- **DLQ**: Dead letter queue for error handling
- **Throttle**: Rate limiting and throttling
- **Checkpoint**: State persistence and recovery
- **Circuit Breaker**: Fault tolerance patterns

### 🚚 Transports
- **REST**: HTTP/HTTPS communication
- **SOAP**: Legacy SOAP web services
- **GraphQL**: Modern GraphQL APIs
- **JDBC**: Database connections
- **Kafka**: Message streaming
- **MQTT**: IoT messaging
- **SFTP**: Secure file transfer
- **File System**: Local file operations
- **Custom**: Extensible transport layer

### 🛡️ Policies
- **QoS**: Quality of service with priorities
- **Idempotency**: Duplicate request handling
- **mTLS**: Mutual TLS authentication
- **OPA**: Open Policy Agent integration
- **Secrets**: Vault-based secret management

### 📊 Observability
- **Tracing**: W3C trace context propagation
- **Sampling**: Configurable sampling rates
- **Payload Sampling**: Selective data capture
- **Metrics**: Performance monitoring
- **Logging**: Structured logging with levels

## Installation

```bash
npm install @fusionflow/flow-dsl
```

## Usage

### Basic Flow Definition

```typescript
import { FlowSchema, validateFlow } from '@fusionflow/flow-dsl';

const flowDefinition = {
  metadata: {
    name: "My Data Flow",
    version: "1.0.0",
    description: "A simple data processing flow",
    tags: ["etl", "production"]
  },
  steps: [
    {
      id: "start",
      name: "Start",
      step: {
        type: "checkpoint",
        name: "flow-start"
      },
      next: ["process-data"]
    },
    {
      id: "process-data",
      name: "Process Data",
      step: {
        type: "map",
        expression: '{ "processed": true, "data": $.input }',
        outputFormat: "json"
      },
      next: ["complete"]
    },
    {
      id: "complete",
      name: "Complete",
      step: {
        type: "checkpoint",
        name: "flow-complete"
      },
      next: []
    }
  ]
};

// Validate the flow
const validationResult = validateFlow(flowDefinition);
if (validationResult.valid) {
  console.log("Flow is valid!");
} else {
  console.error("Validation errors:", validationResult.errors);
}
```

### YAML Flow Definition

```yaml
metadata:
  name: "API Integration Flow"
  version: "1.0.0"
  description: "Fetch data from API and store in database"

triggers:
  - type: http
    method: POST
    path: "/api/v1/trigger"
    headers:
      Content-Type: "application/json"

steps:
  - id: "fetch-data"
    name: "Fetch Data"
    step:
      type: connector
      connectorRef: "http-connector"
      operation: "get"
      config:
        url: "https://api.example.com/data"
    transport:
      type: rest
      method: GET
      url: "https://api.example.com/data"
    next: ["transform-data"]

  - id: "transform-data"
    name: "Transform Data"
    step:
      type: map
      expression: |
        {
          "id": $.id,
          "name": $.name,
          "processed_at": now()
        }
      variables:
        now: "${new Date().toISOString()}"
    next: ["store-data"]

  - id: "store-data"
    name: "Store Data"
    step:
      type: connector
      connectorRef: "postgres-connector"
      operation: "insert"
      config:
        table: "processed_data"
    transport:
      type: jdbc
      url: "jdbc:postgresql://localhost:5432/mydb"
      username: "${env.DB_USER}"
      password: "${env.DB_PASSWORD}"
    next: ["complete"]

  - id: "complete"
    name: "Complete"
    step:
      type: checkpoint
      name: "flow-complete"
    next: []
```

### Advanced Features

#### Compliance and Security

```yaml
metadata:
  name: "HIPAA Compliant Flow"
  compliance:
    hipaa: true
    dataRetention: 2555
    dataClassification: "confidential"
  rbac:
    roles: ["data-engineer", "compliance-officer"]
    permissions: ["read", "write", "execute"]
  owners:
    - name: "Data Engineering Team"
      email: "data-eng@company.com"
      team: "Data Engineering"
      role: "Primary Owner"
```

#### Error Handling and Resilience

```yaml
steps:
  - id: "resilient-step"
    name: "Resilient Processing"
    step:
      type: connector
      connectorRef: "external-api"
      operation: "process"
      timeout: 30
      retry:
        attempts: 3
        backoff:
          type: exponential
          initialDelay: 1000
          maxDelay: 30000
          multiplier: 2
    policies:
      - type: circuitBreaker
        failureThreshold: 5
        recoveryTimeout: 60
    error: "error-handler"
```

#### Observability

```yaml
observability:
  traceId:
    propagation: w3c
    sampling:
      rate: 1.0
      strategy: always
  sampleRate: 1.0
  payloadSampling:
    enabled: true
    rate: 0.1
    maxSize: 1024
  metrics:
    enabled: true
    interval: 60
  logs:
    level: info
    structured: true
```

## Validation

The Flow DSL includes comprehensive validation:

```typescript
import { validateFlow, getValidationErrors } from '@fusionflow/flow-dsl';

const result = validateFlow(flowDefinition);

if (!result.valid) {
  console.error(getValidationErrors(result));
  // Output:
  // Validation failed with 2 error(s):
  // steps[1].step.expression: JSONata expression is required (MAP_EXPRESSION_MISSING)
  // steps[2].next[0]: Referenced step "nonexistent" does not exist (INVALID_NEXT_STEP_REFERENCE)
}
```

## Testing

Run the test suite:

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Examples

See the `examples/flows/` directory for complete flow examples:

- `simple-api-flow.yaml` - Basic API integration
- `data-sync-flow.yaml` - Complex data synchronization
- `iot-data-processing.yaml` - IoT sensor data processing

## Schema Reference

The complete JSON Schema is available at `schema/flow.schema.json` and can be used for:

- IDE autocompletion
- Schema validation
- Documentation generation
- Tool integration

## Contributing

1. Follow the project's coding standards
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
