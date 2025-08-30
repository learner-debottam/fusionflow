import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-metrics-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PLATFORM_NAME, PLATFORM_VERSION, OTEL } from '@fusionflow/common';

export interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  traceExporter: 'otlp' | 'console' | 'none';
  metricExporter: 'otlp' | 'prometheus' | 'console' | 'none';
  otlpEndpoint?: string;
  samplingRate: number;
  enableAutoInstrumentation: boolean;
  enableMetrics: boolean;
  enableTraces: boolean;
  prometheusPort?: number;
}

export function getDefaultConfig(): OpenTelemetryConfig {
  return {
    serviceName: process.env.OTEL_SERVICE_NAME || 'fusionflow-api',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || PLATFORM_VERSION,
    environment: process.env.NODE_ENV || 'development',
    traceExporter: (process.env.OTEL_TRACE_EXPORTER as any) || 'otlp',
    metricExporter: (process.env.OTEL_METRIC_EXPORTER as any) || 'prometheus',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '1.0'),
    enableAutoInstrumentation: process.env.OTEL_AUTO_INSTRUMENTATION !== 'false',
    enableMetrics: process.env.OTEL_METRICS_ENABLED !== 'false',
    enableTraces: process.env.OTEL_TRACES_ENABLED !== 'false',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
  };
}

export function createResource(config: OpenTelemetryConfig): Resource {
  return new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    'platform.name': PLATFORM_NAME,
    'platform.version': PLATFORM_VERSION,
  });
}

export function createTraceExporter(config: OpenTelemetryConfig) {
  switch (config.traceExporter) {
    case 'otlp':
      return new OTLPTraceExporter({
        url: `${config.otlpEndpoint}/v1/traces`,
        headers: {},
        timeoutMillis: 30000,
      });
    case 'console':
      return new (require('@opentelemetry/exporter-trace-console')).ConsoleSpanExporter();
    case 'none':
    default:
      return undefined;
  }
}

export function createMetricExporter(config: OpenTelemetryConfig) {
  switch (config.metricExporter) {
    case 'otlp':
      return new OTLPMetricExporter({
        url: `${config.otlpEndpoint}/v1/metrics`,
        headers: {},
        timeoutMillis: 30000,
      });
    case 'prometheus':
      return new PrometheusExporter({
        port: config.prometheusPort,
        endpoint: '/metrics',
      });
    case 'console':
      return new (require('@opentelemetry/exporter-metrics-console')).ConsoleMetricExporter();
    case 'none':
    default:
      return undefined;
  }
}

export function createMetricReader(config: OpenTelemetryConfig) {
  const exporter = createMetricExporter(config);
  if (!exporter) return undefined;

  if (config.metricExporter === 'prometheus') {
    return undefined; // PrometheusExporter handles its own reading
  }

  return new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 5000,
    exportTimeoutMillis: 30000,
  });
}

export function createSpanProcessor(config: OpenTelemetryConfig) {
  const exporter = createTraceExporter(config);
  if (!exporter) return undefined;

  return new BatchSpanProcessor(exporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  });
}

export function initializeOpenTelemetry(config: OpenTelemetryConfig = getDefaultConfig()): NodeSDK | undefined {
  if (!config.enableTraces && !config.enableMetrics) {
    console.log('OpenTelemetry disabled');
    return undefined;
  }

  const resource = createResource(config);
  const spanProcessor = config.enableTraces ? createSpanProcessor(config) : undefined;
  const metricReader = config.enableMetrics ? createMetricReader(config) : undefined;

  const sdk = new NodeSDK({
    resource,
    spanProcessor,
    metricReader,
    instrumentations: config.enableAutoInstrumentation ? [getNodeAutoInstrumentations()] : [],
  });

  // Initialize the SDK
  sdk.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down OpenTelemetry...');
    await sdk.shutdown();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return sdk;
}

export function getTracer(name: string = 'fusionflow-api') {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name);
}

export function getMeter(name: string = 'fusionflow-api') {
  const { metrics } = require('@opentelemetry/api');
  return metrics.getMeter(name);
}
