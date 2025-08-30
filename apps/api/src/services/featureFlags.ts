import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { FeatureFlag } from '../types';
import { getTracer } from '../config/otel';

// Feature flag configuration schema
const FeatureFlagConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  dependencies: z.array(z.string()).optional(),
  environment: z.string().optional(),
  tenant: z.string().optional(),
});

// Feature flags configuration from environment
const FEATURE_FLAGS_CONFIG = {
  // Core features
  'api-v2': {
    enabled: process.env.FEATURE_API_V2 === 'true',
    description: 'Enable API v2 endpoints',
    rolloutPercentage: 100,
  },
  'advanced-auth': {
    enabled: process.env.FEATURE_ADVANCED_AUTH === 'true',
    description: 'Enable advanced authentication features',
    rolloutPercentage: 50,
  },
  'real-time-executions': {
    enabled: process.env.FEATURE_REAL_TIME_EXECUTIONS === 'true',
    description: 'Enable real-time execution monitoring',
    rolloutPercentage: 25,
  },
  'flow-simulation': {
    enabled: process.env.FEATURE_FLOW_SIMULATION === 'true',
    description: 'Enable flow simulation capabilities',
    rolloutPercentage: 75,
  },
  'advanced-connectors': {
    enabled: process.env.FEATURE_ADVANCED_CONNECTORS === 'true',
    description: 'Enable advanced connector features',
    rolloutPercentage: 100,
  },
  'audit-logging': {
    enabled: process.env.FEATURE_AUDIT_LOGGING === 'true',
    description: 'Enable comprehensive audit logging',
    rolloutPercentage: 100,
  },
  'performance-monitoring': {
    enabled: process.env.FEATURE_PERFORMANCE_MONITORING === 'true',
    description: 'Enable performance monitoring features',
    rolloutPercentage: 100,
  },
  'multi-tenancy': {
    enabled: process.env.FEATURE_MULTI_TENANCY === 'true',
    description: 'Enable multi-tenancy support',
    rolloutPercentage: 0, // Disabled by default
  },
  'edge-computing': {
    enabled: process.env.FEATURE_EDGE_COMPUTING === 'true',
    description: 'Enable edge computing capabilities',
    rolloutPercentage: 0, // Disabled by default
  },
  'ai-assist': {
    enabled: process.env.FEATURE_AI_ASSIST === 'true',
    description: 'Enable AI-assisted flow creation',
    rolloutPercentage: 10, // Limited rollout
  },
};

// Feature flags service
export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private tracer = getTracer('feature-flags');

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags() {
    Object.entries(FEATURE_FLAGS_CONFIG).forEach(([name, config]) => {
      this.flags.set(name, {
        name,
        enabled: config.enabled,
        description: config.description,
        rolloutPercentage: config.rolloutPercentage,
        dependencies: config.dependencies,
      });
    });
  }

  // Check if a feature flag is enabled
  async isEnabled(
    flagName: string,
    context?: {
      userId?: string;
      tenant?: string;
      environment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<boolean> {
    const span = this.tracer.startSpan('feature_flag_check', {
      attributes: {
        'feature_flag.name': flagName,
        'feature_flag.user_id': context?.userId,
        'feature_flag.tenant': context?.tenant,
        'feature_flag.environment': context?.environment,
      },
    });

    try {
      const flag = this.flags.get(flagName);
      
      if (!flag) {
        span.setAttributes({
          'feature_flag.exists': false,
          'feature_flag.enabled': false,
        });
        return false;
      }

      // Check if flag is globally enabled
      if (!flag.enabled) {
        span.setAttributes({
          'feature_flag.exists': true,
          'feature_flag.enabled': false,
          'feature_flag.reason': 'globally_disabled',
        });
        return false;
      }

      // Check dependencies
      if (flag.dependencies && flag.dependencies.length > 0) {
        for (const dependency of flag.dependencies) {
          const dependencyEnabled = await this.isEnabled(dependency, context);
          if (!dependencyEnabled) {
            span.setAttributes({
              'feature_flag.exists': true,
              'feature_flag.enabled': false,
              'feature_flag.reason': 'dependency_disabled',
              'feature_flag.dependency': dependency,
            });
            return false;
          }
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
        const userId = context?.userId;
        if (userId) {
          const hash = this.hashString(userId);
          const percentage = hash % 100;
          
          if (percentage >= flag.rolloutPercentage) {
            span.setAttributes({
              'feature_flag.exists': true,
              'feature_flag.enabled': false,
              'feature_flag.reason': 'rollout_percentage',
              'feature_flag.rollout_percentage': flag.rolloutPercentage,
              'feature_flag.user_percentage': percentage,
            });
            return false;
          }
        }
      }

      span.setAttributes({
        'feature_flag.exists': true,
        'feature_flag.enabled': true,
        'feature_flag.reason': 'enabled',
      });

      return true;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: 'Feature flag check failed' });
      return false;
    } finally {
      span.end();
    }
  }

  // Get all feature flags
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  // Get a specific feature flag
  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagName) || null;
  }

  // Update a feature flag (for admin purposes)
  async updateFlag(flagName: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
    const flag = this.flags.get(flagName);
    if (!flag) {
      return null;
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      ...updates,
      name: flagName, // Ensure name doesn't change
    };

    this.flags.set(flagName, updatedFlag);
    return updatedFlag;
  }

  // Check multiple feature flags at once
  async checkMultiple(
    flagNames: string[],
    context?: {
      userId?: string;
      tenant?: string;
      environment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      flagNames.map(async (flagName) => {
        results[flagName] = await this.isEnabled(flagName, context);
      })
    );

    return results;
  }

  // Get feature flags for a specific user
  async getUserFlags(
    userId: string,
    context?: {
      tenant?: string;
      environment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<Record<string, boolean>> {
    const allFlags = await this.getAllFlags();
    const flagNames = allFlags.map(flag => flag.name);
    
    return this.checkMultiple(flagNames, { userId, ...context });
  }

  // Simple hash function for consistent user assignment
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Feature flags plugin
export const featureFlagsPlugin: FastifyPluginAsync = async (fastify) => {
  const featureFlagService = new FeatureFlagService();

  // Decorate fastify with feature flag service
  fastify.decorate('featureFlags', featureFlagService);

  // Add feature flag check helper
  fastify.decorate('isFeatureEnabled', async (flagName: string, context?: any) => {
    return featureFlagService.isEnabled(flagName, context);
  });

  // Feature flags routes
  fastify.get('/feature-flags', {
    schema: {
      tags: ['feature-flags'],
      summary: 'Get all feature flags',
      description: 'Retrieve all available feature flags',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  enabled: { type: 'boolean' },
                  description: { type: 'string' },
                  rolloutPercentage: { type: 'number' },
                  dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
            timestamp: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.requirePermissions(['system:read']),
  }, async (request, reply) => {
    const flags = await featureFlagService.getAllFlags();
    
    return {
      success: true,
      data: flags,
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'] as string,
    };
  });

  fastify.get('/feature-flags/:name', {
    schema: {
      tags: ['feature-flags'],
      summary: 'Get specific feature flag',
      description: 'Retrieve a specific feature flag by name',
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                enabled: { type: 'boolean' },
                description: { type: 'string' },
                rolloutPercentage: { type: 'number' },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            timestamp: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            timestamp: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.requirePermissions(['system:read']),
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const flag = await featureFlagService.getFlag(name);
    
    if (!flag) {
      return reply.status(404).send({
        success: false,
        error: 'Feature flag not found',
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }
    
    return {
      success: true,
      data: flag,
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'] as string,
    };
  });

  fastify.post('/feature-flags/:name/check', {
    schema: {
      tags: ['feature-flags'],
      summary: 'Check if feature flag is enabled',
      description: 'Check if a specific feature flag is enabled for the current user',
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      body: {
        type: 'object',
        properties: {
          context: {
            type: 'object',
            properties: {
              tenant: { type: 'string' },
              environment: { type: 'string' },
              attributes: { type: 'object' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                flag: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    enabled: { type: 'boolean' },
                    description: { type: 'string' },
                    rolloutPercentage: { type: 'number' },
                  },
                },
              },
            },
            timestamp: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const { context } = request.body as { context?: any };
    
    const userId = request.user?.id;
    const enabled = await featureFlagService.isEnabled(name, {
      userId,
      ...context,
    });
    
    const flag = await featureFlagService.getFlag(name);
    
    return {
      success: true,
      data: {
        enabled,
        flag,
      },
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'] as string,
    };
  });
};

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    featureFlags: FeatureFlagService;
    isFeatureEnabled(flagName: string, context?: any): Promise<boolean>;
  }
}
