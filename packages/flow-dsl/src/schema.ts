import { z } from 'zod';

// Node types
export const NodeTypeSchema = z.enum([
  'source',
  'transform',
  'filter',
  'aggregate',
  'destination',
  'condition',
  'loop',
  'error_handler'
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

// Node configuration schema
export const NodeConfigSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type NodeConfig = z.infer<typeof NodeConfigSchema>;

// Edge types
export const EdgeTypeSchema = z.enum([
  'data',
  'control',
  'error',
  'conditional'
]);

export type EdgeType = z.infer<typeof EdgeTypeSchema>;

// Edge configuration schema
export const EdgeConfigSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: EdgeTypeSchema,
  condition: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;

// Trigger types
export const TriggerTypeSchema = z.enum([
  'manual',
  'schedule',
  'webhook',
  'event',
  'file_watch',
  'database_change'
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

// Trigger configuration schema
export const TriggerConfigSchema = z.object({
  type: TriggerTypeSchema,
  config: z.record(z.unknown()),
  schedule: z.string().optional(), // Cron expression for schedule triggers
  enabled: z.boolean().default(true),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;

// Flow status
export const FlowStatusSchema = z.enum([
  'draft',
  'active',
  'inactive',
  'error',
  'archived'
]);

export type FlowStatus = z.infer<typeof FlowStatusSchema>;

// Main flow schema
export const FlowSchema = z.object({
  version: z.string().default('1.0.0'),
  name: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nodes: z.array(NodeConfigSchema),
  edges: z.array(EdgeConfigSchema),
  triggers: z.array(TriggerConfigSchema).optional(),
  status: FlowStatusSchema.default('draft'),
  settings: z.object({
    timeout: z.number().default(300), // seconds
    retry: z.object({
      attempts: z.number().default(3),
      delay: z.number().default(1000), // milliseconds
    }).optional(),
    errorHandling: z.object({
      continueOnError: z.boolean().default(false),
      fallbackNode: z.string().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type Flow = z.infer<typeof FlowSchema>;

// Flow template schema
export const FlowTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  flow: FlowSchema,
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object']),
    required: z.boolean(),
    default: z.unknown().optional(),
    description: z.string().optional(),
  })).optional(),
});

export type FlowTemplate = z.infer<typeof FlowTemplateSchema>;

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Flow execution context
export interface ExecutionContext {
  flowId: string;
  executionId: string;
  input: unknown;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// Node execution result
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  metadata: Record<string, unknown>;
}

// Flow execution result
export interface FlowExecutionResult {
  executionId: string;
  flowId: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  nodeResults: NodeExecutionResult[];
  metadata: Record<string, unknown>;
}
