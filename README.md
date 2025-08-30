# FusionFlow

> Next-generation middleware integration platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/fusionflow/fusionflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fusionflow/fusionflow/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

## 🚀 Overview

FusionFlow is a modern, scalable middleware integration platform designed for building complex data pipelines and workflow automation. Built with security, observability, and horizontal scalability in mind.

### Key Features

- **🔌 Connector Ecosystem**: Pre-built connectors for popular services and protocols
- **🔄 Visual Flow Designer**: Drag-and-drop interface for building data pipelines
- **📊 Real-time Monitoring**: Live execution tracking and performance metrics
- **🔒 Security-First**: Zero-trust architecture with comprehensive security controls
- **📈 Horizontal Scaling**: Built for high-throughput, distributed deployments
- **🔍 Observability**: Full-stack tracing and metrics with OpenTelemetry

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │    │   API Server    │    │  Edge Agent     │
│   (Next.js)     │◄──►│   (Fastify)     │◄──►│   (Go)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Observability │
                    │   Stack         │
                    │   (OTel)        │
                    └─────────────────┘
```

## 📁 Project Structure

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

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Fastify
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Edge**: Go
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Observability**: OpenTelemetry
- **Containerization**: Docker (multi-stage, distroless)
- **CI/CD**: GitHub Actions
- **Documentation**: OpenAPI/Swagger

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Docker (optional)
- Go 1.21+ (for edge agent)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fusionflow/fusionflow.git
   cd fusionflow
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   # Start all services
   pnpm dev
   
   # Or start individual services
   pnpm dev --filter=@fusionflow/api
   pnpm dev --filter=@fusionflow/ui
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/docs
   - UI: http://localhost:3001 (coming soon)

## 📚 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all development servers
pnpm dev --filter=@fusionflow/api  # Start specific service

# Building
pnpm build            # Build all packages
pnpm build --filter=@fusionflow/api  # Build specific package

# Testing
pnpm test             # Run all tests
pnpm test --filter=@fusionflow/api  # Test specific package

# Linting & Formatting
pnpm lint             # Lint all packages
pnpm format           # Format all code
pnpm type-check       # Type check all packages

# Docker
pnpm docker:all       # Build all Docker images
pnpm docker:push      # Push all Docker images

# Release
pnpm changeset        # Create a changeset
pnpm release          # Publish packages
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   pnpm dev
   pnpm test
   pnpm lint
   ```

3. **Commit with conventional commits**
   ```bash
   git commit -m "feat(api): add new connector endpoint"
   ```

4. **Create a changeset (for packages)**
   ```bash
   pnpm changeset
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config with custom rules
- **Prettier**: Consistent formatting
- **Conventional Commits**: Standardized commit messages

### Testing

- **Unit Tests**: Jest with TypeScript support
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright (coming soon)

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# OpenTelemetry
OTEL_SERVICE_NAME=fusionflow-api
OTEL_TRACE_EXPORTER=console
OTEL_METRIC_EXPORTER=console

# Database
DATABASE_URL=postgresql://fusionflow:password@localhost:5432/fusionflow

# Security
JWT_SECRET=your-super-secret-jwt-key
```

### Docker Development

```bash
# Build and run API
docker build -f apps/api/Dockerfile -t fusionflow-api .
docker run -p 3000:3000 fusionflow-api

# Run with docker-compose (coming soon)
docker-compose up
```

## 📊 Observability

FusionFlow includes comprehensive observability:

- **Tracing**: Distributed tracing with OpenTelemetry
- **Metrics**: Custom metrics for flows, connectors, and API
- **Logging**: Structured logging with correlation IDs
- **Health Checks**: Liveness and readiness probes

### Viewing Metrics

```bash
# Start with console exporter (development)
OTEL_TRACE_EXPORTER=console pnpm dev

# Or use a collector (production)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
```

## 🔒 Security

- **Zero-Trust**: No implicit trust between services
- **Input Validation**: Zod schemas for all inputs
- **Rate Limiting**: Configurable rate limiting
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers
- **Container Security**: Distroless images, non-root users

## 🚀 Deployment

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f infra/k8s/

# Or use Helm
helm install fusionflow infra/helm/
```

### Docker

```bash
# Build production images
pnpm docker:all

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all checks pass
6. Submit a pull request

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/fusionflow/fusionflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fusionflow/fusionflow/discussions)
- **Discord**: [Join our community](https://discord.gg/fusionflow)

## 🙏 Acknowledgments

- [Fastify](https://www.fastify.io/) - High-performance web framework
- [OpenTelemetry](https://opentelemetry.io/) - Observability framework
- [Turborepo](https://turbo.build/repo) - Monorepo build system
- [pnpm](https://pnpm.io/) - Fast, disk-efficient package manager

---

**FusionFlow** - Building the future of data integration, one flow at a time. 🚀 