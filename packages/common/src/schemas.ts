import { z } from 'zod';

// Base schemas
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive(),
});

export const MetadataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean()])
);

// Connector schemas
export const ConnectorTypeSchema = z.enum([
  'http',
  'grpc',
  'kafka',
  'redis',
  'postgres',
  'mongodb',
  's3',
  'custom',
]);

export const ConnectorStatusSchema = z.enum([
  'active',
  'inactive',
  'error',
  'connecting',
]);

export const CredentialsSchema = z.object({
  type: z.enum(['basic', 'bearer', 'oauth2', 'api_key']),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  apiKey: z.string().optional(),
});

export const ConnectorConfigSchema = z.object({
  url: z.string().url().optional(),
  credentials: CredentialsSchema.optional(),
  options: z.record(z.unknown()).optional(),
});

export const ConnectorSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  type: ConnectorTypeSchema,
  config: ConnectorConfigSchema,
  status: ConnectorStatusSchema,
  metadata: MetadataSchema,
});

// Flow schemas
export const FlowStatusSchema = z.enum([
  'draft',
  'active',
  'inactive',
  'error',
]);

export const NodeTypeSchema = z.enum([
  'trigger',
  'transform',
  'filter',
  'connector',
  'condition',
  'loop',
  'error_handler',
]);

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const NodeInputSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
});

export const NodeOutputSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

export const NodeConfigSchema = z.record(z.unknown());

export const FlowNodeSchema = BaseEntitySchema.extend({
  type: NodeTypeSchema,
  name: z.string().min(1).max(100),
  position: PositionSchema,
  config: NodeConfigSchema,
  inputs: z.array(NodeInputSchema),
  outputs: z.array(NodeOutputSchema),
});

export const FlowEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  sourceOutput: z.string(),
  targetNodeId: z.string().uuid(),
  targetInput: z.string(),
  condition: z.string().optional(),
});

export const TriggerTypeSchema = z.enum([
  'manual',
  'schedule',
  'webhook',
  'event',
]);

export const TriggerConfigSchema = z.record(z.unknown());

export const FlowTriggerSchema = z.object({
  type: TriggerTypeSchema,
  config: TriggerConfigSchema,
  schedule: z.string().optional(),
});

export const FlowSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  triggers: z.array(FlowTriggerSchema),
  status: FlowStatusSchema,
  metadata: MetadataSchema,
});

// Event schemas
export const EventSchema = BaseEntitySchema.extend({
  type: z.string().min(1),
  source: z.string().min(1),
  data: z.unknown(),
  metadata: MetadataSchema,
  correlationId: z.string().uuid().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
});

// Execution schemas
export const ExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const ExecutionSchema = BaseEntitySchema.extend({
  flowId: z.string().uuid(),
  status: ExecutionStatusSchema,
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().positive().optional(),
  traceId: z.string(),
  spanId: z.string(),
});

// API schemas
export const CreateConnectorRequestSchema = z.object({
  name: z.string().min(1).max(100),
  type: ConnectorTypeSchema,
  config: ConnectorConfigSchema,
  metadata: MetadataSchema.optional(),
});

export const UpdateConnectorRequestSchema = CreateConnectorRequestSchema.partial();

export const CreateFlowRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  triggers: z.array(FlowTriggerSchema),
  metadata: MetadataSchema.optional(),
});

export const UpdateFlowRequestSchema = CreateFlowRequestSchema.partial();

export const ExecuteFlowRequestSchema = z.object({
  input: z.unknown(),
  correlationId: z.string().uuid().optional(),
});

// Response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.date(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
    timestamp: z.date(),
  }); 