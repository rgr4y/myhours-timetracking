# Tests Directory

This directory contains comprehensive unit tests for the myHours time tracking application using Vitest.

## Structure

- **`main/`** - Tests for main process (Electron backend)
  - `services/` - Service layer tests (IPC, database, logger, path, auto-updater)
- **`renderer/`** - Tests for renderer process (React frontend)
  - `components/` - Component tests
  - `context/` - React context tests
  - `hooks/` - Custom hook tests
  - `utils/` - Utility function tests
  - `timer/` - Timer-specific tests
  - `helpers/` - Test helper utilities
  - `integration/` - Integration tests
- **`setup/`** - Test setup files and global mocks

## Test Files

### Main Process Tests
- **Service Tests** - IPC handlers, database operations, logging, path resolution, auto-updater
- **Integration Tests** - Cross-service functionality

### Renderer Process Tests  
- **Component Tests** - UI component logic and behavior
- **Context Tests** - React context state management
- **Hook Tests** - Custom React hook functionality
- **Timer Tests** - Timer-specific component and logic tests
- **Integration Tests** - Cross-component interactions

## Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI (if installed)
npm run test:ui

# Run tests with coverage (if configured)
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Timer Context Logic
- Timer state management (start/stop/pause functionality)
- Time tracking and elapsed time calculations
- Timer state transitions
- Error handling for timer operations
- Timer data validation
- Window focus handling for time recalculation
- Tray integration functionality
- Timer persistence and restoration

### Timer Utilities
- Time formatting (HH:MM:SS format)
- Elapsed time calculations
- Timer rounding functionality
- Timer data validation
- Window event handling
- Performance utilities (debounce/throttle)

## Test Configuration

Tests are configured using Vitest with:
- **Environment**: jsdom for DOM testing
- **Setup**: Comprehensive mocks for electronAPI and browser APIs
- **Timeout**: 10 seconds for longer-running tests
- **JSX Support**: For React component testing

## Mocking Strategy

The test setup includes mocks for:
- `window.electronAPI` - Complete Electron API mock
- React components and hooks
- Browser APIs (matchMedia, CustomEvent)
- Styled-components
- Lucide React icons

## Best Practices

1. **Isolated Tests**: Each test is independent and doesn't rely on external state
2. **Comprehensive Mocking**: All external dependencies are properly mocked
3. **Error Scenarios**: Tests include error handling and edge cases
4. **Performance**: Tests use fake timers for time-based functionality
5. **Accessibility**: Tests include accessibility validation where applicable

## Adding New Tests

When adding new tests:

1. Place test files in the appropriate subdirectory
2. Use descriptive test names and group related tests
3. Mock external dependencies appropriately
4. Include both positive and negative test cases
5. Test error scenarios and edge cases
6. Follow the existing naming convention: `ComponentName.test.js`