import { z } from 'zod';

// Connector configuration schema
export const ConnectorConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  config: z.record(z.unknown()),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;

// Connection test result
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  error?: string;
}

// Data operation result
export interface DataOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: Record<string, 'asc' | 'desc'>;
  filter?: Record<string, unknown>;
}

// Connector interface
export interface Connector {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Data operations
  testConnection(): Promise<ConnectionTestResult>;
  query(options?: QueryOptions): Promise<DataOperationResult>;
  insert(data: unknown): Promise<DataOperationResult>;
  update(id: string, data: unknown): Promise<DataOperationResult>;
  delete(id: string): Promise<DataOperationResult>;
  
  // Metadata
  getSchema(): Promise<Record<string, unknown>>;
  getCapabilities(): Promise<string[]>;
}

// Connector factory
export interface ConnectorFactory {
  create(config: ConnectorConfig): Promise<Connector>;
  getSupportedTypes(): string[];
}

// Event types
export enum ConnectorEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DATA_RECEIVED = 'data_received',
  ERROR = 'error',
}

export interface ConnectorEvent {
  type: ConnectorEventType;
  connectorId: string;
  timestamp: Date;
  data?: unknown;
  error?: string;
}

// Event handler
export type ConnectorEventHandler = (event: ConnectorEvent) => void;
