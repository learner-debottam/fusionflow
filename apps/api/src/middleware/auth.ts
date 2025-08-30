import { FastifyRequest, FastifyReply } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-client';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { AuthenticatedUser, AuthContext } from '../types';
import { HTTP_STATUS, ERROR_CODES } from '@fusionflow/common';

// JWT payload schema
const JwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  preferred_username: z.string().optional(),
  realm_access: z.object({
    roles: z.array(z.string()),
  }).optional(),
  resource_access: z.record(z.object({
    roles: z.array(z.string()),
  })).optional(),
  iat: z.number(),
  exp: z.number(),
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
});

// JWKS client configuration
interface JwksConfig {
  jwksUri: string;
  issuer: string;
  audience: string | string[];
  algorithms: string[];
  cacheTime: number;
  rateLimit: boolean;
  jwksRequestsPerMinute: number;
}

const defaultJwksConfig: JwksConfig = {
  jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/master/protocol/openid-connect/certs',
  issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/master',
  audience: process.env.KEYCLOAK_AUDIENCE || 'fusionflow-api',
  algorithms: ['RS256'],
  cacheTime: 3600000, // 1 hour
  rateLimit: true,
  jwksRequestsPerMinute: 10,
};

// JWKS client cache
const jwksCache = new NodeCache({ stdTTL: defaultJwksConfig.cacheTime / 1000 });

// JWKS client instance
const jwksClientInstance = jwksClient({
  jwksUri: defaultJwksConfig.jwksUri,
  rateLimit: defaultJwksConfig.rateLimit,
  jwksRequestsPerMinute: defaultJwksConfig.jwksRequestsPerMinute,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: defaultJwksConfig.cacheTime,
});

// Get signing key from JWKS
async function getSigningKey(kid: string): Promise<string> {
  const cacheKey = `key_${kid}`;
  let publicKey = jwksCache.get<string>(cacheKey);
  
  if (!publicKey) {
    const key = await jwksClientInstance.getSigningKey(kid);
    publicKey = key.getPublicKey();
    jwksCache.set(cacheKey, publicKey);
  }
  
  return publicKey;
}

// Verify JWT token
async function verifyToken(token: string): Promise<AuthenticatedUser> {
  try {
    // Decode header to get kid
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader === 'string') {
      throw new Error('Invalid token format');
    }

    const kid = decodedHeader.header.kid;
    if (!kid) {
      throw new Error('No key ID in token header');
    }

    // Get public key
    const publicKey = await getSigningKey(kid);

    // Verify token
    const payload = jwt.verify(token, publicKey, {
      algorithms: defaultJwksConfig.algorithms,
      issuer: defaultJwksConfig.issuer,
      audience: defaultJwksConfig.audience,
    });

    // Validate payload schema
    const validatedPayload = JwtPayloadSchema.parse(payload);

    // Extract roles from different possible locations
    const roles: string[] = [];
    
    if (validatedPayload.realm_access?.roles) {
      roles.push(...validatedPayload.realm_access.roles);
    }
    
    if (validatedPayload.resource_access) {
      Object.values(validatedPayload.resource_access).forEach(access => {
        if (access.roles) {
          roles.push(...access.roles);
        }
      });
    }

    // Map roles to permissions (simplified for now)
    const permissions = mapRolesToPermissions(roles);

    return {
      id: validatedPayload.sub,
      email: validatedPayload.email,
      roles,
      permissions,
      iat: validatedPayload.iat,
      exp: validatedPayload.exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

// Map roles to permissions (simplified implementation)
function mapRolesToPermissions(roles: string[]): string[] {
  const permissions: string[] = [];
  
  // Admin role gets all permissions
  if (roles.includes('admin') || roles.includes('fusionflow-admin')) {
    permissions.push(
      'flows:read', 'flows:write', 'flows:delete',
      'connectors:read', 'connectors:write', 'connectors:delete',
      'executions:read', 'executions:write', 'executions:delete',
      'users:read', 'users:write', 'users:delete',
      'system:read', 'system:write'
    );
    return permissions;
  }

  // User role gets basic permissions
  if (roles.includes('user') || roles.includes('fusionflow-user')) {
    permissions.push(
      'flows:read', 'flows:write',
      'connectors:read', 'connectors:write',
      'executions:read', 'executions:write'
    );
  }

  // Viewer role gets read-only permissions
  if (roles.includes('viewer') || roles.includes('fusionflow-viewer')) {
    permissions.push(
      'flows:read',
      'connectors:read',
      'executions:read'
    );
  }

  return permissions;
}

// Authentication middleware
export const authMiddleware: FastifyPluginAsync = async (fastify) => {
  // Register JWT plugin
  await fastify.register(require('@fastify/jwt'), {
    secret: {
      private: process.env.JWT_SECRET || 'your-secret-key',
      public: process.env.JWT_PUBLIC_KEY,
    },
    sign: {
      algorithm: 'RS256',
      expiresIn: '24h',
    },
    verify: {
      algorithms: ['RS256'],
    },
  });

  // Authentication hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authentication for public routes
    const publicRoutes = [
      '/healthz',
      '/readyz',
      '/livez',
      '/docs',
      '/openapi.json',
      '/metrics',
    ];

    if (publicRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    // Get authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: 'Authorization header required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }

    // Extract token
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: 'Invalid authorization header format',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }

    const token = tokenMatch[1];

    try {
      // Verify token
      const user = await verifyToken(token);
      
      // Attach user to request
      request.user = user;
      
      // Add to request context
      if (request.context) {
        request.context.user = user;
      }

      fastify.log.info({
        msg: 'User authenticated',
        userId: user.id,
        email: user.email,
        roles: user.roles,
        correlationId: request.headers['x-correlation-id'],
      });

    } catch (error) {
      fastify.log.warn({
        msg: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: request.headers['x-correlation-id'],
      });

      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: 'Invalid or expired token',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }
  });
};

// Authorization middleware factory
export function requireRoles(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }

    const hasRequiredRole = roles.some(role => request.user!.roles.includes(role));
    if (!hasRequiredRole) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: 'Insufficient permissions',
        code: ERROR_CODES.AUTHORIZATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }
  };
}

// Permission-based authorization middleware factory
export function requirePermissions(permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: 'Authentication required',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }

    const hasRequiredPermission = permissions.some(permission => 
      request.user!.permissions.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: 'Insufficient permissions',
        code: ERROR_CODES.AUTHORIZATION_ERROR,
        timestamp: new Date().toISOString(),
        correlationId: request.headers['x-correlation-id'] as string,
      });
    }
  };
}

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return; // Continue without authentication
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      return; // Continue without authentication
    }

    const token = tokenMatch[1];

    try {
      const user = await verifyToken(token);
      request.user = user;
      
      if (request.context) {
        request.context.user = user;
      }

      fastify.log.info({
        msg: 'User authenticated (optional)',
        userId: user.id,
        email: user.email,
        correlationId: request.headers['x-correlation-id'],
      });

    } catch (error) {
      // Log but don't fail the request
      fastify.log.debug({
        msg: 'Optional authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: request.headers['x-correlation-id'],
      });
    }
  });
};
