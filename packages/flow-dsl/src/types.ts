import { z } from 'zod';

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const ComplianceSchema = z.object({
  gdpr: z.boolean().default(false),
  hipaa: z.boolean().default(false),
  soc2: z.boolean().default(false),
  pci: z.boolean().default(false),
  dataRetention: z.number().optional(), // days
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
});

export const RBACSchema = z.object({
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.enum(['read', 'write', 'execute', 'admin'])).default(['read']),
  tenants: z.array(z.string()).optional(),
});

export const OwnerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  team: z.string().optional(),
  role: z.string().optional(),
});

export const MetadataSchema = z.object({
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  tenant: z.string().optional(),
  tags: z.array(z.string()).default([]),
  owners: z.array(OwnerSchema).default([]),
  compliance: ComplianceSchema.optional(),
  rbac: RBACSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

// ============================================================================
// TRIGGER SCHEMAS
// ============================================================================

export const HttpTriggerSchema = z.object({
  type: z.literal('http'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  path: z.string(),
  headers: z.record(z.string()).optional(),
  auth: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'api-key']).default('none'),
    config: z.record(z.string()).optional(),
  }).optional(),
  rateLimit: z.object({
    requests: z.number(),
    window: z.number(), // seconds
  }).optional(),
});

export const ScheduleTriggerSchema = z.object({
  type: z.literal('schedule'),
  cron: z.string(), // cron expression
  timezone: z.string().default('UTC'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const KafkaTriggerSchema = z.object({
  type: z.literal('kafka'),
  topic: z.string(),
  groupId: z.string(),
  bootstrapServers: z.array(z.string()),
  autoCommit: z.boolean().default(true),
  autoOffsetReset: z.enum(['earliest', 'latest']).default('earliest'),
  keyDeserializer: z.string().default('org.apache.kafka.common.serialization.StringDeserializer'),
  valueDeserializer: z.string().default('org.apache.kafka.common.serialization.StringDeserializer'),
});

export const MqttTriggerSchema = z.object({
  type: z.literal('mqtt'),
  topic: z.string(),
  qos: z.number().min(0).max(2).default(1),
  broker: z.string(),
  clientId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const SftpTriggerSchema = z.object({
  type: z.literal('sftp'),
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  path: z.string(),
  pattern: z.string().default('*'),
  pollInterval: z.number().default(60), // seconds
});

export const JdbcTriggerSchema = z.object({
  type: z.literal('jdbc'),
  url: z.string(),
  username: z.string(),
  password: z.string(),
  query: z.string(),
  pollInterval: z.number().default(60), // seconds
  driver: z.string(),
});

export const FileWatchTriggerSchema = z.object({
  type: z.literal('file-watch'),
  path: z.string(),
  pattern: z.string().default('*'),
  events: z.array(z.enum(['create', 'modify', 'delete'])).default(['create']),
  recursive: z.boolean().default(false),
});

export const TriggerSchema = z.discriminatedUnion('type', [
  HttpTriggerSchema,
  ScheduleTriggerSchema,
  KafkaTriggerSchema,
  MqttTriggerSchema,
  SftpTriggerSchema,
  JdbcTriggerSchema,
  FileWatchTriggerSchema,
]);

// ============================================================================
// STEP SCHEMAS
// ============================================================================

export const ConnectorStepSchema = z.object({
  type: z.literal('connector'),
  connectorRef: z.string(),
  operation: z.string(),
  config: z.record(z.unknown()).optional(),
  timeout: z.number().optional(), // seconds
  retry: z.object({
    attempts: z.number().default(3),
    backoff: z.object({
      type: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
      initialDelay: z.number().default(1000), // ms
      maxDelay: z.number().default(30000), // ms
      multiplier: z.number().default(2),
    }).optional(),
  }).optional(),
});

export const MapStepSchema = z.object({
  type: z.literal('map'),
  expression: z.string(), // JSONata expression
  variables: z.record(z.unknown()).optional(),
  outputFormat: z.enum(['json', 'xml', 'csv']).default('json'),
});

export const ScriptStepSchema = z.object({
  type: z.literal('script'),
  language: z.enum(['javascript', 'python']),
  code: z.string(),
  timeout: z.number().default(30), // seconds
  sandbox: z.boolean().default(true),
  imports: z.array(z.string()).optional(),
});

export const EnrichStepSchema = z.object({
  type: z.literal('enrich'),
  source: z.string(), // connectorRef or URL
  key: z.string(), // field to match on
  fields: z.array(z.string()).optional(), // fields to include
  timeout: z.number().default(10), // seconds
});

export const BranchStepSchema = z.object({
  type: z.literal('branch'),
  conditions: z.array(z.object({
    condition: z.string(), // JSONata expression
    nextStep: z.string(),
  })),
  default: z.string().optional(),
});

export const RetryStepSchema = z.object({
  type: z.literal('retry'),
  maxAttempts: z.number().default(3),
  backoff: z.object({
    type: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
    initialDelay: z.number().default(1000), // ms
    maxDelay: z.number().default(30000), // ms
    multiplier: z.number().default(2),
  }),
  retryOn: z.array(z.string()).default(['*']), // error patterns to retry on
});

export const DlqStepSchema = z.object({
  type: z.literal('dlq'),
  reason: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const ThrottleStepSchema = z.object({
  type: z.literal('throttle'),
  rate: z.number(), // requests per second
  burst: z.number().optional(), // burst capacity
  strategy: z.enum(['token-bucket', 'leaky-bucket', 'fixed-window']).default('token-bucket'),
});

export const CheckpointStepSchema = z.object({
  type: z.literal('checkpoint'),
  name: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const CircuitBreakerStepSchema = z.object({
  type: z.literal('circuitBreaker'),
  failureThreshold: z.number().default(5),
  recoveryTimeout: z.number().default(60), // seconds
  halfOpenMaxCalls: z.number().default(3),
  monitorInterval: z.number().default(10), // seconds
});

export const StepSchema = z.discriminatedUnion('type', [
  ConnectorStepSchema,
  MapStepSchema,
  ScriptStepSchema,
  EnrichStepSchema,
  BranchStepSchema,
  RetryStepSchema,
  DlqStepSchema,
  ThrottleStepSchema,
  CheckpointStepSchema,
  CircuitBreakerStepSchema,
]);

// ============================================================================
// TRANSPORT SCHEMAS
// ============================================================================

export const RestTransportSchema = z.object({
  type: z.literal('rest'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  url: z.string(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().default(30), // seconds
  retry: z.object({
    attempts: z.number().default(3),
    backoff: z.object({
      type: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
      initialDelay: z.number().default(1000), // ms
      maxDelay: z.number().default(30000), // ms
      multiplier: z.number().default(2),
    }).optional(),
  }).optional(),
});

export const SoapTransportSchema = z.object({
  type: z.literal('soap'),
  url: z.string(),
  action: z.string(),
  envelope: z.string(),
  timeout: z.number().default(30), // seconds
  headers: z.record(z.string()).optional(),
});

export const GraphqlTransportSchema = z.object({
  type: z.literal('graphql'),
  url: z.string(),
  query: z.string(),
  variables: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().default(30), // seconds
});

export const JdbcTransportSchema = z.object({
  type: z.literal('jdbc'),
  url: z.string(),
  username: z.string(),
  password: z.string(),
  query: z.string(),
  parameters: z.array(z.unknown()).optional(),
  timeout: z.number().default(30), // seconds
  connectionPool: z.object({
    min: z.number().default(1),
    max: z.number().default(10),
  }).optional(),
});

export const KafkaTransportSchema = z.object({
  type: z.literal('kafka'),
  topic: z.string(),
  bootstrapServers: z.array(z.string()),
  keySerializer: z.string().default('org.apache.kafka.common.serialization.StringSerializer'),
  valueSerializer: z.string().default('org.apache.kafka.common.serialization.StringSerializer'),
  acks: z.enum(['0', '1', 'all']).default('1'),
  retries: z.number().default(3),
});

export const MqttTransportSchema = z.object({
  type: z.literal('mqtt'),
  topic: z.string(),
  qos: z.number().min(0).max(2).default(1),
  broker: z.string(),
  clientId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  retain: z.boolean().default(false),
});

export const SftpTransportSchema = z.object({
  type: z.literal('sftp'),
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  path: z.string(),
  mode: z.enum(['upload', 'download']),
});

export const FsTransportSchema = z.object({
  type: z.literal('fs'),
  path: z.string(),
  mode: z.enum(['read', 'write', 'append']),
  encoding: z.string().default('utf8'),
  createDir: z.boolean().default(false),
});

export const CustomTransportSchema = z.object({
  type: z.literal('custom'),
  name: z.string(),
  config: z.record(z.unknown()),
});

export const TransportSchema = z.discriminatedUnion('type', [
  RestTransportSchema,
  SoapTransportSchema,
  GraphqlTransportSchema,
  JdbcTransportSchema,
  KafkaTransportSchema,
  MqttTransportSchema,
  SftpTransportSchema,
  FsTransportSchema,
  CustomTransportSchema,
]);

// ============================================================================
// POLICY SCHEMAS
// ============================================================================

export const QosPolicySchema = z.object({
  type: z.literal('qos'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  timeout: z.number().optional(), // seconds
  retry: z.object({
    attempts: z.number().default(3),
    backoff: z.object({
      type: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
      initialDelay: z.number().default(1000), // ms
      maxDelay: z.number().default(30000), // ms
      multiplier: z.number().default(2),
    }).optional(),
  }).optional(),
});

export const IdempotencyPolicySchema = z.object({
  type: z.literal('idempotency'),
  key: z.string(), // JSONata expression to generate idempotency key
  ttl: z.number().default(3600), // seconds
  strategy: z.enum(['cache', 'database']).default('cache'),
});

export const MtlsPolicySchema = z.object({
  type: z.literal('mtls'),
  certPath: z.string(),
  keyPath: z.string(),
  caPath: z.string().optional(),
  verify: z.boolean().default(true),
});

export const OpaPolicySchema = z.object({
  type: z.literal('opa'),
  policyRef: z.string(),
  data: z.record(z.unknown()).optional(),
  input: z.record(z.unknown()).optional(),
});

export const SecretsPolicySchema = z.object({
  type: z.literal('secrets'),
  vaultPaths: z.array(z.string()),
  refreshInterval: z.number().default(300), // seconds
});

export const PolicySchema = z.discriminatedUnion('type', [
  QosPolicySchema,
  IdempotencyPolicySchema,
  MtlsPolicySchema,
  OpaPolicySchema,
  SecretsPolicySchema,
]);

// ============================================================================
// OBSERVABILITY SCHEMAS
// ============================================================================

export const TraceConfigSchema = z.object({
  propagation: z.enum(['w3c', 'b3', 'jaeger']).default('w3c'),
  sampling: z.object({
    rate: z.number().min(0).max(1).default(1.0),
    strategy: z.enum(['always', 'probabilistic', 'rate-limiting']).default('always'),
  }).optional(),
});

export const PayloadSamplingSchema = z.object({
  enabled: z.boolean().default(false),
  rate: z.number().min(0).max(1).default(0.1),
  maxSize: z.number().default(1024), // bytes
  fields: z.array(z.string()).optional(), // specific fields to sample
});

export const ObservabilitySchema = z.object({
  traceId: TraceConfigSchema.optional(),
  sampleRate: z.number().min(0).max(1).default(1.0),
  payloadSampling: PayloadSamplingSchema.optional(),
  metrics: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().default(60), // seconds
  }).optional(),
  logs: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    structured: z.boolean().default(true),
  }).optional(),
});

// ============================================================================
// MAIN FLOW SCHEMA
// ============================================================================

export const FlowSchema = z.object({
  $schema: z.string().default('https://json-schema.org/draft/2020-12/schema'),
  metadata: MetadataSchema,
  triggers: z.array(TriggerSchema).optional(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    step: StepSchema,
    transport: TransportSchema.optional(),
    policies: z.array(PolicySchema).optional(),
    next: z.array(z.string()).optional(), // next step IDs
    error: z.string().optional(), // error step ID
  })),
  observability: ObservabilitySchema.optional(),
});

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type Compliance = z.infer<typeof ComplianceSchema>;
export type RBAC = z.infer<typeof RBACSchema>;
export type Owner = z.infer<typeof OwnerSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;

export type HttpTrigger = z.infer<typeof HttpTriggerSchema>;
export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;
export type KafkaTrigger = z.infer<typeof KafkaTriggerSchema>;
export type MqttTrigger = z.infer<typeof MqttTriggerSchema>;
export type SftpTrigger = z.infer<typeof SftpTriggerSchema>;
export type JdbcTrigger = z.infer<typeof JdbcTriggerSchema>;
export type FileWatchTrigger = z.infer<typeof FileWatchTriggerSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;

export type ConnectorStep = z.infer<typeof ConnectorStepSchema>;
export type MapStep = z.infer<typeof MapStepSchema>;
export type ScriptStep = z.infer<typeof ScriptStepSchema>;
export type EnrichStep = z.infer<typeof EnrichStepSchema>;
export type BranchStep = z.infer<typeof BranchStepSchema>;
export type RetryStep = z.infer<typeof RetryStepSchema>;
export type DlqStep = z.infer<typeof DlqStepSchema>;
export type ThrottleStep = z.infer<typeof ThrottleStepSchema>;
export type CheckpointStep = z.infer<typeof CheckpointStepSchema>;
export type CircuitBreakerStep = z.infer<typeof CircuitBreakerStepSchema>;
export type Step = z.infer<typeof StepSchema>;

export type RestTransport = z.infer<typeof RestTransportSchema>;
export type SoapTransport = z.infer<typeof SoapTransportSchema>;
export type GraphqlTransport = z.infer<typeof GraphqlTransportSchema>;
export type JdbcTransport = z.infer<typeof JdbcTransportSchema>;
export type KafkaTransport = z.infer<typeof KafkaTransportSchema>;
export type MqttTransport = z.infer<typeof MqttTransportSchema>;
export type SftpTransport = z.infer<typeof SftpTransportSchema>;
export type FsTransport = z.infer<typeof FsTransportSchema>;
export type CustomTransport = z.infer<typeof CustomTransportSchema>;
export type Transport = z.infer<typeof TransportSchema>;

export type QosPolicy = z.infer<typeof QosPolicySchema>;
export type IdempotencyPolicy = z.infer<typeof IdempotencyPolicySchema>;
export type MtlsPolicy = z.infer<typeof MtlsPolicySchema>;
export type OpaPolicy = z.infer<typeof OpaPolicySchema>;
export type SecretsPolicy = z.infer<typeof SecretsPolicySchema>;
export type Policy = z.infer<typeof PolicySchema>;

export type TraceConfig = z.infer<typeof TraceConfigSchema>;
export type PayloadSampling = z.infer<typeof PayloadSamplingSchema>;
export type Observability = z.infer<typeof ObservabilitySchema>;

export type Flow = z.infer<typeof FlowSchema>;

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

export type {
  FlowTemplate,
  NodeConfig,
  EdgeConfig,
  TriggerConfig,
  NodeType,
  EdgeType,
  TriggerType,
  FlowStatus,
  ValidationResult,
  ExecutionContext,
  NodeExecutionResult,
  FlowExecutionResult,
} from './schema';
