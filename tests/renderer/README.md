# Renderer Tests

This directory contains tests for the renderer process (React frontend) of the myHours application.

## Directory Structure

The structure mirrors `src/renderer/src/`:

- **`components/`** - Component unit and integration tests
- **`context/`** - React context provider tests  
- **`hooks/`** - Custom React hook tests
- **`utils/`** - Utility function tests
- **`timer/`** - Timer-specific component and logic tests
- **`helpers/`** - Test helper utilities and mocks
- **`integration/`** - Integration tests between renderer components

## Test Patterns

### Component Tests
- Focus on component logic and behavior
- Use mocked dependencies (electronAPI, contexts)
- Test user interactions and state changes

### Context Tests  
- Test context provider logic
- Validate state management patterns
- Test context value derivations

### Hook Tests
- Test custom hook logic in isolation
- Mock external dependencies
- Test hook state and effect behavior

### Integration Tests
- Test component interactions
- Cross-cutting concerns (timezone handling, etc.)
- End-to-end renderer flows

## Import Patterns

Tests use either:
- Relative imports: `../../src/renderer/src/...`  
- Alias imports: `@renderer/...`

Both patterns are supported by the build configuration.
