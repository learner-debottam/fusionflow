import { z } from 'zod';

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface Metadata {
  [key: string]: string | number | boolean;
}

// Connector types
export interface Connector extends BaseEntity {
  name: string;
  type: ConnectorType;
  config: ConnectorConfig;
  status: ConnectorStatus;
  metadata: Metadata;
}

export enum ConnectorType {
  HTTP = 'http',
  GRPC = 'grpc',
  KAFKA = 'kafka',
  REDIS = 'redis',
  POSTGRES = 'postgres',
  MONGODB = 'mongodb',
  S3 = 's3',
  CUSTOM = 'custom',
}

export enum ConnectorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONNECTING = 'connecting',
}

export interface ConnectorConfig {
  url?: string;
  credentials?: Credentials;
  options?: Record<string, unknown>;
}

export interface Credentials {
  type: 'basic' | 'bearer' | 'oauth2' | 'api_key';
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
}

// Flow types
export interface Flow extends BaseEntity {
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  triggers: FlowTrigger[];
  status: FlowStatus;
  metadata: Metadata;
}

export enum FlowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export interface FlowNode extends BaseEntity {
  type: NodeType;
  name: string;
  position: Position;
  config: NodeConfig;
  inputs: NodeInput[];
  outputs: NodeOutput[];
}

export enum NodeType {
  TRIGGER = 'trigger',
  TRANSFORM = 'transform',
  FILTER = 'filter',
  CONNECTOR = 'connector',
  CONDITION = 'condition',
  LOOP = 'loop',
  ERROR_HANDLER = 'error_handler',
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeConfig {
  [key: string]: unknown;
}

export interface NodeInput {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface NodeOutput {
  name: string;
  type: string;
  description?: string;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
  condition?: string;
}

export interface FlowTrigger {
  type: TriggerType;
  config: TriggerConfig;
  schedule?: string;
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  EVENT = 'event',
}

export interface TriggerConfig {
  [key: string]: unknown;
}

// Event types
export interface Event extends BaseEntity {
  type: string;
  source: string;
  data: unknown;
  metadata: Metadata;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
}

// Execution types
export interface Execution extends BaseEntity {
  flowId: string;
  status: ExecutionStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  traceId: string;
  spanId: string;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

 