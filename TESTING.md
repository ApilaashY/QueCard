# Testing Guide for Quecard

## Overview

This project uses **Jest** and **React Testing Library** for comprehensive testing.

## Test Structure

```
quecard/
├── app/
│   ├── __tests__/               # Component tests
│   │   └── page.test.tsx
│   └── api/
│       └── queue-card/
│           └── generate/
│               └── __tests__/    # API route tests
│                   └── route.test.ts
└── lib/
    └── __tests__/               # Utility/library tests
        └── supabase.test.ts
```

## Test Types

### 1. **Component Tests** (`app/__tests__/`)

Tests React components for:

- Rendering behavior
- User interactions
- State management
- Error handling

### 2. **API Route Tests** (`app/api/**/__tests__/`)

Tests Next.js API routes for:

- Request handling
- Response formatting
- Error cases
- Database interactions
- External API calls (mocked)

### 3. **Utility Tests** (`lib/__tests__/`)

Tests utility functions and libraries:

- Supabase client initialization
- Helper functions
- Data transformations

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### Component Test Example

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### API Route Test Example

```typescript
import { NextRequest } from "next/server";
import { POST } from "../route";

describe("POST /api/endpoint", () => {
  it("handles valid request", async () => {
    const request = new NextRequest("http://localhost/api/endpoint", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Mocking

### Mock External APIs

```typescript
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    // mock implementation
  })),
}));
```

### Mock Supabase

```typescript
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));
```

### Mock Environment Variables

Environment variables are automatically mocked in `jest.setup.ts`

## Coverage Goals

Aim for:

- **80%+ overall coverage**
- **90%+ for critical paths** (API routes, data processing)
- **70%+ for UI components**

View coverage report:

```bash
npm run test:coverage
```

Coverage report is generated in `coverage/` directory.

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component/function does, not how it does it
2. **Use descriptive test names** - `it('should show error when PDF is missing')` not `it('test1')`
3. **Keep tests focused** - One assertion per test when possible
4. **Mock external dependencies** - Don't make real API calls or database queries
5. **Test edge cases** - Empty inputs, null values, error states
6. **Clean up after tests** - Use `beforeEach`/`afterEach` to reset state

## Continuous Integration

Add to your CI/CD pipeline:

```bash
npm run test:coverage
```

This will fail the build if tests fail, ensuring code quality.

## What to Test

### ✅ Always Test

- User interactions (clicks, form submissions)
- API responses (success and error cases)
- Edge cases and error handling
- Data transformations
- Critical business logic

### ⚠️ Consider Testing

- Component rendering
- State changes
- Conditional rendering
- Helper functions

### ❌ Don't Test

- Third-party libraries
- Next.js internals
- CSS styling (use snapshot tests sparingly)

## Debugging Tests

```bash
# Run specific test file
npm test -- page.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="renders correctly"

# Run with verbose output
npm test -- --verbose
```

## Next Steps

1. **Add more test coverage** as you build features
2. **Set up GitHub Actions** to run tests on every PR
3. **Add integration tests** for complete user flows
4. **Consider E2E tests** with Playwright or Cypress for critical paths
