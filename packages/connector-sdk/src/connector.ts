import { Connector, ConnectorConfig, ConnectionTestResult, DataOperationResult, QueryOptions } from './types';
import { ConnectorEvent, ConnectorEventType, ConnectorEventHandler } from './types';

// Base connector class that provides common functionality
export abstract class BaseConnector implements Connector {
  public readonly id: string;
  public readonly name: string;
  public readonly type: string;
  public readonly config: Record<string, unknown>;
  
  protected connected = false;
  protected eventHandlers: ConnectorEventHandler[] = [];

  constructor(config: ConnectorConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.config = config.config;
  }

  // Abstract methods that must be implemented by subclasses
  abstract initialize(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract query(options?: QueryOptions): Promise<DataOperationResult>;
  abstract insert(data: unknown): Promise<DataOperationResult>;
  abstract update(id: string, data: unknown): Promise<DataOperationResult>;
  abstract delete(id: string): Promise<DataOperationResult>;
  abstract getSchema(): Promise<Record<string, unknown>>;
  abstract getCapabilities(): Promise<string[]>;

  // Event handling
  public addEventListener(handler: ConnectorEventHandler): void {
    this.eventHandlers.push(handler);
  }

  public removeEventListener(handler: ConnectorEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  protected emitEvent(event: ConnectorEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in connector event handler:', error);
      }
    });
  }

  // Utility methods
  protected emitConnected(): void {
    this.emitEvent({
      type: ConnectorEventType.CONNECTED,
      connectorId: this.id,
      timestamp: new Date(),
    });
  }

  protected emitDisconnected(): void {
    this.emitEvent({
      type: ConnectorEventType.DISCONNECTED,
      connectorId: this.id,
      timestamp: new Date(),
    });
  }

  protected emitDataReceived(data: unknown): void {
    this.emitEvent({
      type: ConnectorEventType.DATA_RECEIVED,
      connectorId: this.id,
      timestamp: new Date(),
      data,
    });
  }

  protected emitError(error: string): void {
    this.emitEvent({
      type: ConnectorEventType.ERROR,
      connectorId: this.id,
      timestamp: new Date(),
      error,
    });
  }

  // Connection status
  public isConnected(): boolean {
    return this.connected;
  }

  // Configuration validation
  protected validateConfig(requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!(field in this.config)) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  // Helper method for creating error results
  protected createErrorResult(error: string): DataOperationResult {
    this.emitError(error);
    return {
      success: false,
      error,
    };
  }

  // Helper method for creating success results
  protected createSuccessResult<T>(data?: T, metadata?: Record<string, unknown>): DataOperationResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }
}
