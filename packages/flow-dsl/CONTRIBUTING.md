# Contributing to Flow DSL

Thank you for your interest in contributing to the FusionFlow DSL! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Validation](#validation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git

### Quick Start

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/fusionflow.git
   cd fusionflow
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build the Flow DSL package:
   ```bash
   cd packages/flow-dsl
   pnpm build
   ```

## Development Setup

### Local Development

1. **Start development mode:**
   ```bash
   cd packages/flow-dsl
   pnpm dev
   ```

2. **Run tests in watch mode:**
   ```bash
   pnpm test:watch
   ```

3. **Run linting:**
   ```bash
   pnpm lint
   pnpm lint:fix  # Auto-fix issues
   ```

4. **Format code:**
   ```bash
   pnpm format
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `build` | Build the package |
| `dev` | Build in watch mode |
| `test` | Run tests |
| `test:watch` | Run tests in watch mode |
| `test:coverage` | Run tests with coverage |
| `test:run` | Run tests once |
| `lint` | Run ESLint |
| `lint:fix` | Fix ESLint issues |
| `format` | Format code with Prettier |
| `format:check` | Check code formatting |
| `type-check` | Run TypeScript type checking |
| `validate-examples` | Validate example flows |
| `security-check` | Run security audit |
| `bundle-size` | Check bundle size |

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer `const` over `let`
- Use explicit return types for public functions
- Use interfaces for object shapes
- Use discriminated unions for complex types
- Avoid `any` type - use `unknown` instead

### Naming Conventions

- **Files:** kebab-case (e.g., `flow-validator.ts`)
- **Classes:** PascalCase (e.g., `FlowValidator`)
- **Functions:** camelCase (e.g., `validateFlow`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces:** PascalCase (e.g., `FlowDefinition`)

### Documentation

- Use JSDoc for all public functions and classes
- Include examples in documentation
- Document complex business logic
- Keep README.md up to date

Example JSDoc:
```typescript
/**
 * Validates a Flow DSL definition against the schema
 * @param flow - The flow definition to validate
 * @returns Validation result with errors and warnings
 * @example
 * ```typescript
 * const result = validateFlow(flowDefinition);
 * if (result.valid) {
 *   console.log('Flow is valid');
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateFlow(flow: unknown): ValidationResult {
  // implementation
}
```

## Testing

### Test Structure

Tests should be organized as follows:
- Unit tests: `src/__tests__/`
- Integration tests: `src/__tests__/integration/`
- Example validation: `src/__tests__/examples/`

### Writing Tests

1. **Test naming:** Use descriptive names that explain the scenario
2. **Test structure:** Follow AAA pattern (Arrange, Act, Assert)
3. **Coverage:** Aim for 90%+ coverage on critical paths
4. **Mocks:** Mock external dependencies

Example test:
```typescript
describe('FlowValidator', () => {
  describe('validateFlow', () => {
    it('should validate a simple flow successfully', () => {
      // Arrange
      const flow = {
        metadata: { name: 'Test Flow', version: '1.0.0' },
        steps: [{ id: 'step1', name: 'Test Step', step: { type: 'checkpoint', name: 'test' } }]
      };

      // Act
      const result = validateFlow(flow);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject flow with missing metadata', () => {
      // Arrange
      const flow = { steps: [] };

      // Act
      const result = validateFlow(flow);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_METADATA',
          message: expect.stringContaining('metadata')
        })
      );
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests once (for CI)
pnpm test:run
```

## Validation

### Schema Validation

The Flow DSL uses JSON Schema for validation. When adding new features:

1. Update the Zod schemas in `src/types.ts`
2. Update the JSON Schema in `schema/flow.schema.json`
3. Add validation logic in `src/validate.ts`
4. Add tests for the new validation rules

### Example Validation

All example flows in `examples/flows/` are automatically validated:

```bash
# Validate all examples
pnpm validate-examples

# Validate specific example
node scripts/validate-examples.js examples/flows/simple-api-flow.yaml
```

### Round-trip Testing

We use round-trip testing to ensure YAML ↔ TypeScript ↔ YAML conversion works correctly:

```bash
# Run round-trip tests
pnpm test:run -- --grep "round-trip"
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass:**
   ```bash
   pnpm test:run
   pnpm test:coverage
   ```

2. **Run validation:**
   ```bash
   pnpm validate-examples
   pnpm type-check
   pnpm lint
   pnpm format:check
   ```

3. **Check for security issues:**
   ```bash
   pnpm security-check
   ```

### PR Guidelines

1. **Title:** Use conventional commit format
   - `feat: add new trigger type`
   - `fix: resolve validation error in map step`
   - `docs: update README with new examples`

2. **Description:** Include:
   - What changes were made
   - Why changes were made
   - How to test the changes
   - Any breaking changes

3. **Checklist:**
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Examples updated (if applicable)
   - [ ] No hardcoded secrets
   - [ ] Follows code style guidelines

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Examples validate correctly
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No hardcoded secrets
- [ ] Security audit passed

## Breaking Changes
List any breaking changes here, or "None"

## Additional Notes
Any additional information
```

## Release Process

### Version Management

We use semantic versioning:
- **Patch** (0.1.x): Bug fixes and minor improvements
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### Release Steps

1. **Update version:**
   ```bash
   cd packages/flow-dsl
   npm version patch|minor|major
   ```

2. **Update changelog:**
   - Document new features
   - List breaking changes
   - Update examples if needed

3. **Create release PR:**
   - Update version in package.json
   - Update CHANGELOG.md
   - Ensure all tests pass

4. **Merge to main:**
   - Automated release process triggers
   - Creates GitHub release
   - Publishes to npm (if configured)

### Automated Release

The release process is automated via GitHub Actions:

1. **Trigger:** Push to main branch
2. **Validation:** Runs all tests and checks
3. **Release:** Creates GitHub release with assets
4. **Publish:** Publishes to npm registry
5. **Notification:** Notifies team of release

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community
- Show empathy towards other community members

### Enforcement

- Report unacceptable behavior to maintainers
- Maintainers will investigate and respond appropriately
- Unacceptable behavior will not be tolerated

## Getting Help

- **Issues:** Create an issue for bugs or feature requests
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** Check README.md and inline docs
- **Examples:** Review examples in `examples/flows/`

## License

By contributing to Flow DSL, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to FusionFlow DSL! 🚀
