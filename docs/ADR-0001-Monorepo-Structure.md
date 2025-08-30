# ADR-0001: Monorepo Structure

## Status
Accepted

## Context
FusionFlow is a next-generation middleware integration platform that requires multiple interconnected components:
- API server (Node.js/TypeScript)
- Web UI (Next.js/React)
- Edge agent (Go)
- Shared libraries and SDKs
- Infrastructure configurations

We need to establish a scalable, maintainable project structure that supports:
- Rapid development and iteration
- Shared code and types
- Consistent tooling and processes
- Easy deployment and CI/CD
- Security and observability best practices

## Decision
We will use a **monorepo structure** with the following organization:

```
fusionflow/
├── apps/
│   ├── api/                 # Fastify API server
│   ├── ui/                  # Next.js web application
│   └── edge-agent/          # Go edge agent
├── packages/
│   ├── common/              # Shared types and utilities
│   ├── connector-sdk/       # Connector development SDK
│   ├── flow-dsl/           # Flow definition language
│   └── otlp/               # OpenTelemetry helpers
├── infra/
│   ├── helm/               # Helm charts
│   ├── k8s/                # Kubernetes manifests
│   ├── grafana/            # Grafana dashboards
│   ├── loki/               # Log aggregation
│   └── otel-collector/     # OpenTelemetry collector
├── .github/
│   └── workflows/          # CI/CD pipelines
└── docs/                   # Documentation
```

### Technology Stack
- **Package Manager**: pnpm (workspace support, fast, disk-efficient)
- **Build System**: Turborepo (incremental builds, caching, parallel execution)
- **Language**: TypeScript (type safety, developer experience)
- **Framework**: Fastify (performance, plugin ecosystem)
- **UI**: Next.js + React + Tailwind + shadcn/ui
- **Observability**: OpenTelemetry (standards-based, vendor-neutral)
- **Containerization**: Multi-stage Docker builds with distroless images
- **CI/CD**: GitHub Actions with changesets for versioning

## Rationale

### Why Monorepo?
1. **Shared Code**: Common types, utilities, and configurations can be shared across applications
2. **Atomic Changes**: Related changes across multiple packages can be made in a single commit
3. **Simplified Dependencies**: Internal dependencies are managed automatically
4. **Consistent Tooling**: Single set of linting, testing, and build configurations
5. **Easier Refactoring**: Changes to shared interfaces can be updated across all consumers

### Why pnpm + Turborepo?
1. **pnpm**: 
   - Efficient disk usage through content-addressable storage
   - Strict dependency resolution prevents phantom dependencies
   - Workspace support for monorepo management
   - Fast installation and updates

2. **Turborepo**:
   - Incremental builds with intelligent caching
   - Parallel execution of tasks
   - Remote caching for CI/CD speed
   - Task dependencies and pipeline management

### Why TypeScript?
1. **Type Safety**: Catches errors at compile time
2. **Developer Experience**: Better IDE support, autocomplete, refactoring
3. **API Contracts**: Shared types ensure consistency across services
4. **Documentation**: Types serve as living documentation

### Why Fastify?
1. **Performance**: One of the fastest Node.js web frameworks
2. **Plugin Ecosystem**: Rich ecosystem for security, validation, documentation
3. **TypeScript Support**: Excellent TypeScript integration
4. **Schema Validation**: Built-in JSON Schema validation
5. **OpenAPI**: Automatic OpenAPI/Swagger documentation

### Why OpenTelemetry?
1. **Standards-Based**: Vendor-neutral observability standard
2. **Multi-Language**: Support for Node.js, Go, and other languages
3. **Rich Ecosystem**: Compatible with major observability platforms
4. **Future-Proof**: Industry standard, actively maintained

## Consequences

### Positive
- **Developer Productivity**: Shared tooling, types, and processes
- **Code Quality**: Consistent linting, testing, and formatting
- **Deployment**: Coordinated releases and versioning
- **Observability**: Unified tracing and metrics across services
- **Security**: Centralized security policies and scanning

### Negative
- **Repository Size**: Larger repository with more files
- **Build Complexity**: More complex build pipeline setup
- **Learning Curve**: Developers need to understand monorepo concepts
- **Tooling**: Requires specialized tools (pnpm, Turborepo)

### Mitigations
- **Incremental Adoption**: Start with core packages, add more gradually
- **Documentation**: Comprehensive documentation and examples
- **Automation**: Automated tooling setup and maintenance
- **Training**: Developer onboarding and training materials

## Alternatives Considered

### 1. Multi-Repository Structure
- **Pros**: Independent versioning, smaller repositories, team autonomy
- **Cons**: Code duplication, complex dependency management, harder coordination
- **Decision**: Rejected due to increased complexity and reduced code sharing

### 2. Yarn Workspaces
- **Pros**: Mature workspace support, good performance
- **Cons**: Less efficient disk usage, slower than pnpm
- **Decision**: Rejected in favor of pnpm for better performance

### 3. Lerna
- **Pros**: Mature monorepo tooling
- **Cons**: Slower builds, less efficient caching
- **Decision**: Rejected in favor of Turborepo for better performance

### 4. Express.js
- **Pros**: Familiar, large ecosystem
- **Cons**: Slower performance, less built-in features
- **Decision**: Rejected in favor of Fastify for better performance and features

### 5. Custom Observability Solution
- **Pros**: Tailored to specific needs
- **Cons**: Vendor lock-in, maintenance burden
- **Decision**: Rejected in favor of OpenTelemetry for standards compliance

## Implementation Plan

### Phase 1: Foundation (Current)
- [x] Set up monorepo structure with pnpm and Turborepo
- [x] Create shared packages (common, otlp)
- [x] Implement API server with Fastify
- [x] Add OpenTelemetry integration
- [x] Create Docker configurations
- [x] Set up CI/CD pipeline

### Phase 2: UI and Edge Agent
- [ ] Implement Next.js web application
- [ ] Create Go edge agent
- [ ] Add connector SDK
- [ ] Implement flow DSL

### Phase 3: Infrastructure
- [ ] Create Helm charts
- [ ] Add Kubernetes manifests
- [ ] Set up monitoring stack
- [ ] Implement logging aggregation

### Phase 4: Advanced Features
- [ ] Add authentication and authorization
- [ ] Implement database layer
- [ ] Add caching and queuing
- [ ] Create comprehensive testing

## References
- [Turborepo Documentation](https://turbo.build/repo)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Fastify Documentation](https://www.fastify.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Monorepo Best Practices](https://monorepo.tools/) 