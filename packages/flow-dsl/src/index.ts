// FusionFlow DSL - Domain Specific Language for data flows
export * from './types';
export * from './validate';
export * from './parser';
export * from './validator';

// Legacy exports for backward compatibility
export type {
  FlowTemplate,
  NodeConfig,
  EdgeConfig,
  TriggerConfig,
  NodeType,
  EdgeType,
  TriggerType,
  FlowStatus,
  ValidationResult as LegacyValidationResult,
  ExecutionContext,
  NodeExecutionResult,
  FlowExecutionResult,
} from './schema';

export {
  FlowSchema as LegacyFlowSchema,
  FlowTemplateSchema,
  NodeConfigSchema,
  EdgeConfigSchema,
  TriggerConfigSchema,
  NodeTypeSchema,
  EdgeTypeSchema,
  TriggerTypeSchema,
  FlowStatusSchema,
} from './schema';
