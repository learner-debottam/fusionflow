import { z } from 'zod';
import { FlowSchema, Flow, Step, Trigger, Transport, Policy } from './types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  severity: 'warning';
}

/**
 * Flow validator class
 */
export class FlowValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  /**
   * Validate a flow definition
   */
  validate(flow: unknown): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Schema validation
    const schemaResult = FlowSchema.safeParse(flow);
    if (!schemaResult.success) {
      this.addSchemaErrors(schemaResult.error);
      return this.getResult();
    }

    const validatedFlow = schemaResult.data;

    // Semantic validation
    this.validateMetadata(validatedFlow.metadata);
    this.validateTriggers(validatedFlow.triggers || []);
    this.validateSteps(validatedFlow.steps);
    this.validateStepReferences(validatedFlow.steps);
    this.validateObservability(validatedFlow.observability);

    return this.getResult();
  }

  /**
   * Validate flow metadata
   */
  private validateMetadata(metadata: Flow['metadata']): void {
    // Check for required compliance settings
    if (metadata.compliance?.gdpr || metadata.compliance?.hipaa) {
      if (!metadata.compliance.dataRetention) {
        this.warnings.push({
          path: 'metadata.compliance.dataRetention',
          message: 'Data retention period should be specified for GDPR/HIPAA compliance',
          code: 'COMPLIANCE_DATA_RETENTION_MISSING',
          severity: 'warning'
        });
      }
    }

    // Check for required RBAC settings
    if (metadata.compliance?.hipaa) {
      if (!metadata.rbac?.roles.length) {
        this.errors.push({
          path: 'metadata.rbac.roles',
          message: 'RBAC roles are required for HIPAA compliance',
          code: 'HIPAA_RBAC_REQUIRED',
          severity: 'error'
        });
      }
    }

    // Validate owner information
    if (metadata.owners.length === 0) {
      this.warnings.push({
        path: 'metadata.owners',
        message: 'Flow should have at least one owner',
        code: 'OWNERS_MISSING',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate flow triggers
   */
  private validateTriggers(triggers: Trigger[]): void {
    triggers.forEach((trigger, index) => {
      const path = `triggers[${index}]`;

      switch (trigger.type) {
        case 'http':
          this.validateHttpTrigger(trigger, path);
          break;
        case 'schedule':
          this.validateScheduleTrigger(trigger, path);
          break;
        case 'kafka':
          this.validateKafkaTrigger(trigger, path);
          break;
        case 'mqtt':
          this.validateMqttTrigger(trigger, path);
          break;
        case 'sftp':
          this.validateSftpTrigger(trigger, path);
          break;
        case 'jdbc':
          this.validateJdbcTrigger(trigger, path);
          break;
        case 'file-watch':
          this.validateFileWatchTrigger(trigger, path);
          break;
      }
    });
  }

  /**
   * Validate HTTP trigger
   */
  private validateHttpTrigger(trigger: any, path: string): void {
    if (trigger.auth?.type === 'api-key' && !trigger.auth.config?.key) {
      this.errors.push({
        path: `${path}.auth.config.key`,
        message: 'API key is required for api-key authentication',
        code: 'HTTP_API_KEY_MISSING',
        severity: 'error'
      });
    }

    if (trigger.rateLimit && trigger.rateLimit.requests <= 0) {
      this.errors.push({
        path: `${path}.rateLimit.requests`,
        message: 'Rate limit requests must be greater than 0',
        code: 'HTTP_RATE_LIMIT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate schedule trigger
   */
  private validateScheduleTrigger(trigger: any, path: string): void {
    // Basic cron validation (5 or 6 fields)
    const cronParts = trigger.cron.split(' ');
    if (cronParts.length < 5 || cronParts.length > 6) {
      this.errors.push({
        path: `${path}.cron`,
        message: 'Invalid cron expression format',
        code: 'SCHEDULE_CRON_INVALID',
        severity: 'error'
      });
    }

    if (trigger.startDate && trigger.endDate) {
      const start = new Date(trigger.startDate);
      const end = new Date(trigger.endDate);
      if (start >= end) {
        this.errors.push({
          path: `${path}.endDate`,
          message: 'End date must be after start date',
          code: 'SCHEDULE_DATE_RANGE_INVALID',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate Kafka trigger
   */
  private validateKafkaTrigger(trigger: any, path: string): void {
    if (trigger.bootstrapServers.length === 0) {
      this.errors.push({
        path: `${path}.bootstrapServers`,
        message: 'At least one bootstrap server is required',
        code: 'KAFKA_BOOTSTRAP_SERVERS_EMPTY',
        severity: 'error'
      });
    }
  }

  /**
   * Validate MQTT trigger
   */
  private validateMqttTrigger(trigger: any, path: string): void {
    if (trigger.qos < 0 || trigger.qos > 2) {
      this.errors.push({
        path: `${path}.qos`,
        message: 'QoS must be between 0 and 2',
        code: 'MQTT_QOS_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate SFTP trigger
   */
  private validateSftpTrigger(trigger: any, path: string): void {
    if (!trigger.password && !trigger.privateKey) {
      this.errors.push({
        path: `${path}`,
        message: 'Either password or privateKey must be provided for SFTP authentication',
        code: 'SFTP_AUTH_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate JDBC trigger
   */
  private validateJdbcTrigger(trigger: any, path: string): void {
    if (!trigger.url.startsWith('jdbc:')) {
      this.errors.push({
        path: `${path}.url`,
        message: 'JDBC URL must start with "jdbc:"',
        code: 'JDBC_URL_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate file watch trigger
   */
  private validateFileWatchTrigger(trigger: any, path: string): void {
    if (trigger.events.length === 0) {
      this.errors.push({
        path: `${path}.events`,
        message: 'At least one event type must be specified',
        code: 'FILE_WATCH_EVENTS_EMPTY',
        severity: 'error'
      });
    }
  }

  /**
   * Validate flow steps
   */
  private validateSteps(steps: Flow['steps']): void {
    const stepIds = new Set<string>();

    steps.forEach((step, index) => {
      const path = `steps[${index}]`;

      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        this.errors.push({
          path: `${path}.id`,
          message: `Duplicate step ID: ${step.id}`,
          code: 'DUPLICATE_STEP_ID',
          severity: 'error'
        });
      }
      stepIds.add(step.id);

      // Validate step configuration
      this.validateStep(step, path);
    });
  }

  /**
   * Validate individual step
   */
  private validateStep(step: Flow['steps'][0], path: string): void {
    // Validate step configuration
    this.validateStepConfig(step.step, `${path}.step`);

    // Validate transport if present
    if (step.transport) {
      this.validateTransport(step.transport, `${path}.transport`);
    }

    // Validate policies if present
    if (step.policies) {
      step.policies.forEach((policy, index) => {
        this.validatePolicy(policy, `${path}.policies[${index}]`);
      });
    }
  }

  /**
   * Validate step configuration
   */
  private validateStepConfig(step: Step, path: string): void {
    switch (step.type) {
      case 'connector':
        this.validateConnectorStep(step, path);
        break;
      case 'map':
        this.validateMapStep(step, path);
        break;
      case 'script':
        this.validateScriptStep(step, path);
        break;
      case 'enrich':
        this.validateEnrichStep(step, path);
        break;
      case 'branch':
        this.validateBranchStep(step, path);
        break;
      case 'retry':
        this.validateRetryStep(step, path);
        break;
      case 'dlq':
        this.validateDlqStep(step, path);
        break;
      case 'throttle':
        this.validateThrottleStep(step, path);
        break;
      case 'checkpoint':
        this.validateCheckpointStep(step, path);
        break;
      case 'circuitBreaker':
        this.validateCircuitBreakerStep(step, path);
        break;
    }
  }

  /**
   * Validate connector step
   */
  private validateConnectorStep(step: any, path: string): void {
    if (!step.connectorRef) {
      this.errors.push({
        path: `${path}.connectorRef`,
        message: 'Connector reference is required',
        code: 'CONNECTOR_REF_MISSING',
        severity: 'error'
      });
    }

    if (!step.operation) {
      this.errors.push({
        path: `${path}.operation`,
        message: 'Operation is required',
        code: 'CONNECTOR_OPERATION_MISSING',
        severity: 'error'
      });
    }

    if (step.timeout && step.timeout <= 0) {
      this.errors.push({
        path: `${path}.timeout`,
        message: 'Timeout must be greater than 0',
        code: 'CONNECTOR_TIMEOUT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate map step
   */
  private validateMapStep(step: any, path: string): void {
    if (!step.expression || step.expression.trim() === '') {
      this.errors.push({
        path: `${path}.expression`,
        message: 'JSONata expression is required',
        code: 'MAP_EXPRESSION_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate script step
   */
  private validateScriptStep(step: any, path: string): void {
    if (!step.code || step.code.trim() === '') {
      this.errors.push({
        path: `${path}.code`,
        message: 'Script code is required',
        code: 'SCRIPT_CODE_MISSING',
        severity: 'error'
      });
    }

    if (step.timeout && step.timeout <= 0) {
      this.errors.push({
        path: `${path}.timeout`,
        message: 'Timeout must be greater than 0',
        code: 'SCRIPT_TIMEOUT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate enrich step
   */
  private validateEnrichStep(step: any, path: string): void {
    if (!step.source) {
      this.errors.push({
        path: `${path}.source`,
        message: 'Source is required',
        code: 'ENRICH_SOURCE_MISSING',
        severity: 'error'
      });
    }

    if (!step.key) {
      this.errors.push({
        path: `${path}.key`,
        message: 'Key field is required',
        code: 'ENRICH_KEY_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate branch step
   */
  private validateBranchStep(step: any, path: string): void {
    if (!step.conditions || step.conditions.length === 0) {
      this.errors.push({
        path: `${path}.conditions`,
        message: 'At least one condition is required',
        code: 'BRANCH_CONDITIONS_EMPTY',
        severity: 'error'
      });
    }

    step.conditions?.forEach((condition: any, index: number) => {
      if (!condition.condition) {
        this.errors.push({
          path: `${path}.conditions[${index}].condition`,
          message: 'Condition expression is required',
          code: 'BRANCH_CONDITION_MISSING',
          severity: 'error'
        });
      }

      if (!condition.nextStep) {
        this.errors.push({
          path: `${path}.conditions[${index}].nextStep`,
          message: 'Next step is required',
          code: 'BRANCH_NEXT_STEP_MISSING',
          severity: 'error'
        });
      }
    });
  }

  /**
   * Validate retry step
   */
  private validateRetryStep(step: any, path: string): void {
    if (step.maxAttempts <= 0) {
      this.errors.push({
        path: `${path}.maxAttempts`,
        message: 'Max attempts must be greater than 0',
        code: 'RETRY_MAX_ATTEMPTS_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate DLQ step
   */
  private validateDlqStep(step: any, path: string): void {
    if (!step.reason) {
      this.errors.push({
        path: `${path}.reason`,
        message: 'DLQ reason is required',
        code: 'DLQ_REASON_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate throttle step
   */
  private validateThrottleStep(step: any, path: string): void {
    if (step.rate <= 0) {
      this.errors.push({
        path: `${path}.rate`,
        message: 'Rate must be greater than 0',
        code: 'THROTTLE_RATE_INVALID',
        severity: 'error'
      });
    }

    if (step.burst && step.burst <= 0) {
      this.errors.push({
        path: `${path}.burst`,
        message: 'Burst capacity must be greater than 0',
        code: 'THROTTLE_BURST_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate checkpoint step
   */
  private validateCheckpointStep(step: any, path: string): void {
    if (!step.name) {
      this.errors.push({
        path: `${path}.name`,
        message: 'Checkpoint name is required',
        code: 'CHECKPOINT_NAME_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate circuit breaker step
   */
  private validateCircuitBreakerStep(step: any, path: string): void {
    if (step.failureThreshold <= 0) {
      this.errors.push({
        path: `${path}.failureThreshold`,
        message: 'Failure threshold must be greater than 0',
        code: 'CIRCUIT_BREAKER_THRESHOLD_INVALID',
        severity: 'error'
      });
    }

    if (step.recoveryTimeout <= 0) {
      this.errors.push({
        path: `${path}.recoveryTimeout`,
        message: 'Recovery timeout must be greater than 0',
        code: 'CIRCUIT_BREAKER_TIMEOUT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate transport configuration
   */
  private validateTransport(transport: Transport, path: string): void {
    switch (transport.type) {
      case 'rest':
        this.validateRestTransport(transport, path);
        break;
      case 'soap':
        this.validateSoapTransport(transport, path);
        break;
      case 'graphql':
        this.validateGraphqlTransport(transport, path);
        break;
      case 'jdbc':
        this.validateJdbcTransport(transport, path);
        break;
      case 'kafka':
        this.validateKafkaTransport(transport, path);
        break;
      case 'mqtt':
        this.validateMqttTransport(transport, path);
        break;
      case 'sftp':
        this.validateSftpTransport(transport, path);
        break;
      case 'fs':
        this.validateFsTransport(transport, path);
        break;
      case 'custom':
        this.validateCustomTransport(transport, path);
        break;
    }
  }

  /**
   * Validate REST transport
   */
  private validateRestTransport(transport: any, path: string): void {
    if (!transport.url) {
      this.errors.push({
        path: `${path}.url`,
        message: 'URL is required for REST transport',
        code: 'REST_URL_MISSING',
        severity: 'error'
      });
    }

    if (transport.timeout && transport.timeout <= 0) {
      this.errors.push({
        path: `${path}.timeout`,
        message: 'Timeout must be greater than 0',
        code: 'REST_TIMEOUT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate SOAP transport
   */
  private validateSoapTransport(transport: any, path: string): void {
    if (!transport.url) {
      this.errors.push({
        path: `${path}.url`,
        message: 'URL is required for SOAP transport',
        code: 'SOAP_URL_MISSING',
        severity: 'error'
      });
    }

    if (!transport.action) {
      this.errors.push({
        path: `${path}.action`,
        message: 'SOAP action is required',
        code: 'SOAP_ACTION_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate GraphQL transport
   */
  private validateGraphqlTransport(transport: any, path: string): void {
    if (!transport.url) {
      this.errors.push({
        path: `${path}.url`,
        message: 'URL is required for GraphQL transport',
        code: 'GRAPHQL_URL_MISSING',
        severity: 'error'
      });
    }

    if (!transport.query) {
      this.errors.push({
        path: `${path}.query`,
        message: 'GraphQL query is required',
        code: 'GRAPHQL_QUERY_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate JDBC transport
   */
  private validateJdbcTransport(transport: any, path: string): void {
    if (!transport.url.startsWith('jdbc:')) {
      this.errors.push({
        path: `${path}.url`,
        message: 'JDBC URL must start with "jdbc:"',
        code: 'JDBC_URL_INVALID',
        severity: 'error'
      });
    }

    if (!transport.query) {
      this.errors.push({
        path: `${path}.query`,
        message: 'SQL query is required',
        code: 'JDBC_QUERY_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate Kafka transport
   */
  private validateKafkaTransport(transport: any, path: string): void {
    if (!transport.topic) {
      this.errors.push({
        path: `${path}.topic`,
        message: 'Topic is required for Kafka transport',
        code: 'KAFKA_TOPIC_MISSING',
        severity: 'error'
      });
    }

    if (!transport.bootstrapServers || transport.bootstrapServers.length === 0) {
      this.errors.push({
        path: `${path}.bootstrapServers`,
        message: 'At least one bootstrap server is required',
        code: 'KAFKA_BOOTSTRAP_SERVERS_EMPTY',
        severity: 'error'
      });
    }
  }

  /**
   * Validate MQTT transport
   */
  private validateMqttTransport(transport: any, path: string): void {
    if (!transport.topic) {
      this.errors.push({
        path: `${path}.topic`,
        message: 'Topic is required for MQTT transport',
        code: 'MQTT_TOPIC_MISSING',
        severity: 'error'
      });
    }

    if (!transport.broker) {
      this.errors.push({
        path: `${path}.broker`,
        message: 'Broker is required for MQTT transport',
        code: 'MQTT_BROKER_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate SFTP transport
   */
  private validateSftpTransport(transport: any, path: string): void {
    if (!transport.host) {
      this.errors.push({
        path: `${path}.host`,
        message: 'Host is required for SFTP transport',
        code: 'SFTP_HOST_MISSING',
        severity: 'error'
      });
    }

    if (!transport.path) {
      this.errors.push({
        path: `${path}.path`,
        message: 'Path is required for SFTP transport',
        code: 'SFTP_PATH_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate file system transport
   */
  private validateFsTransport(transport: any, path: string): void {
    if (!transport.path) {
      this.errors.push({
        path: `${path}.path`,
        message: 'Path is required for file system transport',
        code: 'FS_PATH_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate custom transport
   */
  private validateCustomTransport(transport: any, path: string): void {
    if (!transport.name) {
      this.errors.push({
        path: `${path}.name`,
        message: 'Name is required for custom transport',
        code: 'CUSTOM_TRANSPORT_NAME_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate policy configuration
   */
  private validatePolicy(policy: Policy, path: string): void {
    switch (policy.type) {
      case 'qos':
        this.validateQosPolicy(policy, path);
        break;
      case 'idempotency':
        this.validateIdempotencyPolicy(policy, path);
        break;
      case 'mtls':
        this.validateMtlsPolicy(policy, path);
        break;
      case 'opa':
        this.validateOpaPolicy(policy, path);
        break;
      case 'secrets':
        this.validateSecretsPolicy(policy, path);
        break;
    }
  }

  /**
   * Validate QoS policy
   */
  private validateQosPolicy(policy: any, path: string): void {
    if (policy.timeout && policy.timeout <= 0) {
      this.errors.push({
        path: `${path}.timeout`,
        message: 'QoS timeout must be greater than 0',
        code: 'QOS_TIMEOUT_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate idempotency policy
   */
  private validateIdempotencyPolicy(policy: any, path: string): void {
    if (!policy.key) {
      this.errors.push({
        path: `${path}.key`,
        message: 'Idempotency key expression is required',
        code: 'IDEMPOTENCY_KEY_MISSING',
        severity: 'error'
      });
    }

    if (policy.ttl && policy.ttl <= 0) {
      this.errors.push({
        path: `${path}.ttl`,
        message: 'TTL must be greater than 0',
        code: 'IDEMPOTENCY_TTL_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate mTLS policy
   */
  private validateMtlsPolicy(policy: any, path: string): void {
    if (!policy.certPath) {
      this.errors.push({
        path: `${path}.certPath`,
        message: 'Certificate path is required for mTLS',
        code: 'MTLS_CERT_PATH_MISSING',
        severity: 'error'
      });
    }

    if (!policy.keyPath) {
      this.errors.push({
        path: `${path}.keyPath`,
        message: 'Private key path is required for mTLS',
        code: 'MTLS_KEY_PATH_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate OPA policy
   */
  private validateOpaPolicy(policy: any, path: string): void {
    if (!policy.policyRef) {
      this.errors.push({
        path: `${path}.policyRef`,
        message: 'Policy reference is required for OPA policy',
        code: 'OPA_POLICY_REF_MISSING',
        severity: 'error'
      });
    }
  }

  /**
   * Validate secrets policy
   */
  private validateSecretsPolicy(policy: any, path: string): void {
    if (!policy.vaultPaths || policy.vaultPaths.length === 0) {
      this.errors.push({
        path: `${path}.vaultPaths`,
        message: 'At least one Vault path is required',
        code: 'SECRETS_VAULT_PATHS_EMPTY',
        severity: 'error'
      });
    }

    if (policy.refreshInterval && policy.refreshInterval <= 0) {
      this.errors.push({
        path: `${path}.refreshInterval`,
        message: 'Refresh interval must be greater than 0',
        code: 'SECRETS_REFRESH_INTERVAL_INVALID',
        severity: 'error'
      });
    }
  }

  /**
   * Validate step references
   */
  private validateStepReferences(steps: Flow['steps']): void {
    const stepIds = new Set(steps.map(step => step.id));

    steps.forEach((step, index) => {
      const path = `steps[${index}]`;

      // Validate next step references
      if (step.next) {
        step.next.forEach((nextStepId, nextIndex) => {
          if (!stepIds.has(nextStepId)) {
            this.errors.push({
              path: `${path}.next[${nextIndex}]`,
              message: `Referenced step "${nextStepId}" does not exist`,
              code: 'INVALID_NEXT_STEP_REFERENCE',
              severity: 'error'
            });
          }
        });
      }

      // Validate error step reference
      if (step.error && !stepIds.has(step.error)) {
        this.errors.push({
          path: `${path}.error`,
          message: `Referenced error step "${step.error}" does not exist`,
          code: 'INVALID_ERROR_STEP_REFERENCE',
          severity: 'error'
        });
      }
    });
  }

  /**
   * Validate observability configuration
   */
  private validateObservability(observability: Flow['observability']): void {
    if (!observability) return;

    if (observability.sampleRate < 0 || observability.sampleRate > 1) {
      this.errors.push({
        path: 'observability.sampleRate',
        message: 'Sample rate must be between 0 and 1',
        code: 'OBSERVABILITY_SAMPLE_RATE_INVALID',
        severity: 'error'
      });
    }

    if (observability.payloadSampling) {
      if (observability.payloadSampling.rate < 0 || observability.payloadSampling.rate > 1) {
        this.errors.push({
          path: 'observability.payloadSampling.rate',
          message: 'Payload sampling rate must be between 0 and 1',
          code: 'OBSERVABILITY_PAYLOAD_SAMPLING_RATE_INVALID',
          severity: 'error'
        });
      }

      if (observability.payloadSampling.maxSize <= 0) {
        this.errors.push({
          path: 'observability.payloadSampling.maxSize',
          message: 'Payload sampling max size must be greater than 0',
          code: 'OBSERVABILITY_PAYLOAD_SAMPLING_SIZE_INVALID',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Add schema validation errors
   */
  private addSchemaErrors(error: z.ZodError): void {
    error.errors.forEach(zodError => {
      this.errors.push({
        path: zodError.path.join('.'),
        message: zodError.message,
        code: 'SCHEMA_VALIDATION_ERROR',
        severity: 'error'
      });
    });
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

/**
 * Validate a flow definition
 */
export function validateFlow(flow: unknown): ValidationResult {
  const validator = new FlowValidator();
  return validator.validate(flow);
}

/**
 * Check if a flow is valid
 */
export function isFlowValid(flow: unknown): boolean {
  const result = validateFlow(flow);
  return result.valid;
}

/**
 * Get validation errors as a formatted string
 */
export function getValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return 'Flow is valid';
  }

  const errorMessages = result.errors.map(error => 
    `${error.path}: ${error.message} (${error.code})`
  );

  const warningMessages = result.warnings.map(warning => 
    `${warning.path}: ${warning.message} (${warning.code})`
  );

  let output = `Validation failed with ${result.errors.length} error(s):\n`;
  output += errorMessages.join('\n');

  if (result.warnings.length > 0) {
    output += `\n\n${result.warnings.length} warning(s):\n`;
    output += warningMessages.join('\n');
  }

  return output;
}
