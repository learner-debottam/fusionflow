import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';
import { FlowSchema, Flow } from '../types';
import { validateFlow, isFlowValid, getValidationErrors } from '../validate';

describe('Flow DSL Round-Trip Tests', () => {
  describe('Simple API Integration Flow', () => {
    const simpleFlowYaml = `
metadata:
  name: "Simple API Integration Flow"
  version: "1.0.0"
  description: "Simple flow that fetches data from an API, transforms it, and stores it"
  tags:
    - "api"
    - "integration"
    - "demo"

triggers:
  - type: http
    method: POST
    path: "/api/v1/trigger"
    headers:
      Content-Type: "application/json"
    auth:
      type: api-key
      config:
        key: "\${env.API_KEY}"

steps:
  - id: "start"
    name: "Start"
    description: "Initialize the flow"
    step:
      type: checkpoint
      name: "flow-start"
      data:
        timestamp: "\${now()}"
    next: ["fetch-data"]
    error: "error-handler"

  - id: "fetch-data"
    name: "Fetch Data"
    description: "Fetch data from external API"
    step:
      type: connector
      connectorRef: "http-connector"
      operation: "get"
      config:
        url: "https://api.example.com/data"
        headers:
          Authorization: "Bearer \${env.EXTERNAL_API_TOKEN}"
      timeout: 30
      retry:
        attempts: 3
        backoff:
          type: exponential
          initialDelay: 1000
          maxDelay: 10000
          multiplier: 2
    transport:
      type: rest
      method: GET
      url: "https://api.example.com/data"
      headers:
        Authorization: "Bearer \${env.EXTERNAL_API_TOKEN}"
        Accept: "application/json"
      timeout: 30
    policies:
      - type: qos
        priority: normal
        timeout: 30
    next: ["transform-data"]
    error: "error-handler"

  - id: "transform-data"
    name: "Transform Data"
    description: "Transform the fetched data"
    step:
      type: map
      expression: |
        {
          "id": $.id,
          "name": $.name,
          "email": $.email,
          "status": $.status,
          "processed_at": now(),
          "source": "external-api"
        }
      variables:
        now: "\${new Date().toISOString()}"
      outputFormat: json
    next: ["validate-data"]
    error: "error-handler"

  - id: "validate-data"
    name: "Validate Data"
    description: "Validate the transformed data"
    step:
      type: script
      language: javascript
      code: |
        const data = payload.body;
        
        if (!data.id || !data.name || !data.email) {
          throw new Error('Missing required fields: id, name, email');
        }
        
        if (!data.email.includes('@')) {
          throw new Error('Invalid email format');
        }
        
        payload.meta.validation = {
          timestamp: new Date().toISOString(),
          valid: true
        };
        
        return payload;
      timeout: 10
      sandbox: true
    next: ["store-data"]
    error: "error-handler"

  - id: "store-data"
    name: "Store Data"
    description: "Store the data in database"
    step:
      type: connector
      connectorRef: "postgres-connector"
      operation: "insert"
      config:
        table: "processed_data"
        data: "\${payload.body}"
      timeout: 60
      retry:
        attempts: 3
        backoff:
          type: exponential
          initialDelay: 1000
          maxDelay: 30000
          multiplier: 2
    transport:
      type: jdbc
      url: "jdbc:postgresql://\${env.DB_HOST}:\${env.DB_PORT}/\${env.DB_NAME}"
      username: "\${env.DB_USER}"
      password: "\${env.DB_PASSWORD}"
      query: "INSERT INTO processed_data (id, name, email, status, processed_at, source) VALUES (?, ?, ?, ?, ?, ?)"
      timeout: 60
    policies:
      - type: qos
        priority: normal
        timeout: 60
      - type: idempotency
        key: "\${payload.body.id}_\${payload.body.processed_at}"
        ttl: 3600
        strategy: cache
    next: ["complete"]
    error: "error-handler"

  - id: "complete"
    name: "Complete"
    description: "Mark flow as complete"
    step:
      type: checkpoint
      name: "flow-complete"
      data:
        timestamp: "\${now()}"
        status: "completed"
    next: []

  - id: "error-handler"
    name: "Error Handler"
    description: "Handle errors"
    step:
      type: dlq
      reason: "API integration error"
      metadata:
        flow_id: "\${flow.id}"
        error_timestamp: "\${now()}"
    transport:
      type: kafka
      topic: "api-integration-dlq"
      bootstrapServers:
        - "localhost:9092"
      keySerializer: "org.apache.kafka.common.serialization.StringSerializer"
      valueSerializer: "org.apache.kafka.common.serialization.StringSerializer"
      acks: "1"
      retries: 3

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
`;

    it('should parse YAML to Flow object', () => {
      const flowData = yaml.load(simpleFlowYaml) as unknown;
      const result = FlowSchema.safeParse(flowData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const flow = result.data;
        expect(flow.metadata.name).toBe('Simple API Integration Flow');
        expect(flow.metadata.version).toBe('1.0.0');
        expect(flow.triggers).toHaveLength(1);
        expect(flow.steps).toHaveLength(7);
        expect(flow.observability).toBeDefined();
      }
    });

    it('should validate flow successfully', () => {
      const flowData = yaml.load(simpleFlowYaml) as unknown;
      const validationResult = validateFlow(flowData);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should convert back to YAML', () => {
      const flowData = yaml.load(simpleFlowYaml) as unknown;
      const result = FlowSchema.safeParse(flowData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const flow = result.data;
        const yamlString = yaml.dump(flow);
        
        // Should be able to parse the generated YAML back
        const reparsed = yaml.load(yamlString) as unknown;
        const revalidation = validateFlow(reparsed);
        
        expect(revalidation.valid).toBe(true);
      }
    });
  });

  describe('IoT Data Processing Flow', () => {
    const iotFlowYaml = `
metadata:
  name: "IoT Data Processing Flow"
  version: "1.0.0"
  description: "Process IoT sensor data from MQTT, apply real-time analytics, and store results"

triggers:
  - type: mqtt
    topic: "sensors/+/data"
    qos: 1
    broker: "mqtt.broker.com"
    clientId: "fusionflow-iot-processor"
    username: "\${env.MQTT_USERNAME}"
    password: "\${env.MQTT_PASSWORD}"

steps:
  - id: "receive-sensor-data"
    name: "Receive Sensor Data"
    description: "Receive sensor data from MQTT"
    step:
      type: connector
      connectorRef: "mqtt-connector"
      operation: "subscribe"
      config:
        topic: "sensors/+/data"
        qos: 1
      timeout: 10
    transport:
      type: mqtt
      topic: "sensors/+/data"
      qos: 1
      broker: "mqtt.broker.com"
      clientId: "fusionflow-iot-processor"
      username: "\${env.MQTT_USERNAME}"
      password: "\${env.MQTT_PASSWORD}"
      retain: false
    next: ["parse-sensor-data"]
    error: "error-handler"

  - id: "parse-sensor-data"
    name: "Parse Sensor Data"
    description: "Parse and validate sensor data"
    step:
      type: script
      language: javascript
      code: |
        const rawData = payload.body;
        
        let sensorData;
        try {
          sensorData = JSON.parse(rawData);
        } catch (error) {
          throw new Error('Invalid JSON data received');
        }
        
        if (!sensorData.sensorId || !sensorData.timestamp || !sensorData.value) {
          throw new Error('Missing required sensor data fields');
        }
        
        sensorData.receivedAt = new Date().toISOString();
        sensorData.source = 'mqtt';
        sensorData.topic = payload.meta.topic;
        
        payload.body = sensorData;
        return payload;
      timeout: 5
      sandbox: true
    next: ["apply-threshold-check"]
    error: "error-handler"

  - id: "apply-threshold-check"
    name: "Apply Threshold Check"
    description: "Check if sensor values exceed thresholds"
    step:
      type: branch
      conditions:
        - condition: "$.value > 100"
          nextStep: "high-value-alert"
        - condition: "$.value < 0"
          nextStep: "low-value-alert"
      default: "normal-processing"

  - id: "normal-processing"
    name: "Normal Processing"
    description: "Process normal sensor values"
    step:
      type: map
      expression: |
        {
          "sensor_id": $.sensorId,
          "value": $.value,
          "timestamp": $.timestamp,
          "received_at": $.receivedAt,
          "status": "normal",
          "processed": true
        }
      outputFormat: json
    next: ["store-sensor-data"]
    error: "error-handler"

  - id: "store-sensor-data"
    name: "Store Sensor Data"
    description: "Store sensor data in time-series database"
    step:
      type: connector
      connectorRef: "influxdb-connector"
      operation: "write"
      config:
        database: "iot_metrics"
        measurement: "sensor_data"
        tags:
          sensor_id: "\${payload.body.sensor_id}"
          status: "\${payload.body.status}"
        fields:
          value: "\${payload.body.value}"
        timestamp: "\${payload.body.timestamp}"
      timeout: 30
    transport:
      type: rest
      method: POST
      url: "http://\${env.INFLUXDB_HOST}:\${env.INFLUXDB_PORT}/write?db=iot_metrics"
      headers:
        Authorization: "Token \${env.INFLUXDB_TOKEN}"
        Content-Type: "application/octet-stream"
      timeout: 30
    policies:
      - type: qos
        priority: normal
        timeout: 30
      - type: idempotency
        key: "\${payload.body.sensor_id}_\${payload.body.timestamp}"
        ttl: 3600
        strategy: cache
    next: ["complete"]
    error: "error-handler"

  - id: "complete"
    name: "Complete"
    description: "Mark processing as complete"
    step:
      type: checkpoint
      name: "iot-processing-complete"
      data:
        timestamp: "\${now()}"
        status: "completed"
        sensor_id: "\${payload.body.sensor_id}"
    next: []

  - id: "error-handler"
    name: "Error Handler"
    description: "Handle processing errors"
    step:
      type: dlq
      reason: "IoT data processing error"
      metadata:
        flow_id: "\${flow.id}"
        error_timestamp: "\${now()}"
        sensor_id: "\${payload.body.sensorId || 'unknown'}"
    transport:
      type: kafka
      topic: "iot-processing-dlq"
      bootstrapServers:
        - "kafka-1.iot.com:9092"
        - "kafka-2.iot.com:9092"
      keySerializer: "org.apache.kafka.common.serialization.StringSerializer"
      valueSerializer: "org.apache.kafka.common.serialization.StringSerializer"
      acks: "1"
      retries: 3
`;

    it('should parse IoT flow YAML to Flow object', () => {
      const flowData = yaml.load(iotFlowYaml) as unknown;
      const result = FlowSchema.safeParse(flowData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const flow = result.data;
        expect(flow.metadata.name).toBe('IoT Data Processing Flow');
        expect(flow.triggers).toHaveLength(1);
        expect(flow.triggers[0].type).toBe('mqtt');
        expect(flow.steps).toHaveLength(7);
      }
    });

    it('should validate IoT flow successfully', () => {
      const flowData = yaml.load(iotFlowYaml) as unknown;
      const validationResult = validateFlow(flowData);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Validation Error Cases', () => {
    it('should detect missing required fields', () => {
      const invalidFlow = {
        metadata: {
          name: 'Invalid Flow'
        }
        // Missing steps
      };

      const validationResult = validateFlow(invalidFlow);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid step references', () => {
      const flowWithInvalidRefs = {
        metadata: {
          name: 'Flow with Invalid Refs',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            step: {
              type: 'checkpoint',
              name: 'test'
            },
            next: ['nonexistent-step']
          }
        ]
      };

      const validationResult = validateFlow(flowWithInvalidRefs);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some(e => e.code === 'INVALID_NEXT_STEP_REFERENCE')).toBe(true);
    });

    it('should detect duplicate step IDs', () => {
      const flowWithDuplicates = {
        metadata: {
          name: 'Flow with Duplicates',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            step: {
              type: 'checkpoint',
              name: 'test1'
            }
          },
          {
            id: 'step1', // Duplicate ID
            name: 'Step 2',
            step: {
              type: 'checkpoint',
              name: 'test2'
            }
          }
        ]
      };

      const validationResult = validateFlow(flowWithDuplicates);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some(e => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
    });

    it('should detect invalid trigger configuration', () => {
      const flowWithInvalidTrigger = {
        metadata: {
          name: 'Flow with Invalid Trigger',
          version: '1.0.0'
        },
        triggers: [
          {
            type: 'http',
            // Missing required 'path' field
            method: 'POST'
          }
        ],
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            step: {
              type: 'checkpoint',
              name: 'test'
            }
          }
        ]
      };

      const validationResult = validateFlow(flowWithInvalidTrigger);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some(e => e.code === 'SCHEMA_VALIDATION_ERROR')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should check if flow is valid', () => {
      const validFlow = {
        metadata: {
          name: 'Valid Flow',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            step: {
              type: 'checkpoint',
              name: 'test'
            }
          }
        ]
      };

      expect(isFlowValid(validFlow)).toBe(true);
    });

    it('should format validation errors', () => {
      const invalidFlow = {
        metadata: {
          name: 'Invalid Flow'
        }
        // Missing steps
      };

      const validationResult = validateFlow(invalidFlow);
      const errorMessage = getValidationErrors(validationResult);
      
      expect(errorMessage).toContain('Validation failed');
      expect(errorMessage).toContain('error(s)');
    });
  });

  describe('Step Type Validation', () => {
    it('should validate connector step', () => {
      const flow = {
        metadata: {
          name: 'Connector Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'connector-step',
            name: 'Test Connector',
            step: {
              type: 'connector',
              connectorRef: 'test-connector',
              operation: 'read',
              timeout: 30
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate map step', () => {
      const flow = {
        metadata: {
          name: 'Map Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'map-step',
            name: 'Test Map',
            step: {
              type: 'map',
              expression: '{ "id": $.id, "name": $.name }',
              outputFormat: 'json'
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate script step', () => {
      const flow = {
        metadata: {
          name: 'Script Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'script-step',
            name: 'Test Script',
            step: {
              type: 'script',
              language: 'javascript',
              code: 'return payload;',
              timeout: 30,
              sandbox: true
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate branch step', () => {
      const flow = {
        metadata: {
          name: 'Branch Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'branch-step',
            name: 'Test Branch',
            step: {
              type: 'branch',
              conditions: [
                {
                  condition: '$.value > 10',
                  nextStep: 'high-value'
                }
              ],
              default: 'normal-value'
            }
          },
          {
            id: 'high-value',
            name: 'High Value',
            step: {
              type: 'checkpoint',
              name: 'high-value-checkpoint'
            }
          },
          {
            id: 'normal-value',
            name: 'Normal Value',
            step: {
              type: 'checkpoint',
              name: 'normal-value-checkpoint'
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });
  });

  describe('Transport Validation', () => {
    it('should validate REST transport', () => {
      const flow = {
        metadata: {
          name: 'REST Transport Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'rest-step',
            name: 'Test REST',
            step: {
              type: 'connector',
              connectorRef: 'http-connector',
              operation: 'get'
            },
            transport: {
              type: 'rest',
              method: 'GET',
              url: 'https://api.example.com/data',
              timeout: 30
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate Kafka transport', () => {
      const flow = {
        metadata: {
          name: 'Kafka Transport Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'kafka-step',
            name: 'Test Kafka',
            step: {
              type: 'connector',
              connectorRef: 'kafka-connector',
              operation: 'publish'
            },
            transport: {
              type: 'kafka',
              topic: 'test-topic',
              bootstrapServers: ['localhost:9092'],
              keySerializer: 'org.apache.kafka.common.serialization.StringSerializer',
              valueSerializer: 'org.apache.kafka.common.serialization.StringSerializer',
              acks: '1',
              retries: 3
            }
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });
  });

  describe('Policy Validation', () => {
    it('should validate QoS policy', () => {
      const flow = {
        metadata: {
          name: 'QoS Policy Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'qos-step',
            name: 'Test QoS',
            step: {
              type: 'checkpoint',
              name: 'test'
            },
            policies: [
              {
                type: 'qos',
                priority: 'high',
                timeout: 30
              }
            ]
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });

    it('should validate idempotency policy', () => {
      const flow = {
        metadata: {
          name: 'Idempotency Policy Test',
          version: '1.0.0'
        },
        steps: [
          {
            id: 'idempotency-step',
            name: 'Test Idempotency',
            step: {
              type: 'checkpoint',
              name: 'test'
            },
            policies: [
              {
                type: 'idempotency',
                key: '${payload.body.id}',
                ttl: 3600,
                strategy: 'cache'
              }
            ]
          }
        ]
      };

      const validationResult = validateFlow(flow);
      expect(validationResult.valid).toBe(true);
    });
  });
});
