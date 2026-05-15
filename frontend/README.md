# MacMac Frontend

React + TypeScript frontend for the MacMac meal planning application.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **Axios** - HTTP client

## Development Setup

### Install Dependencies

```bash
npm install
# or from project root
make frontend-install
```

### Run Development Server

```bash
npm run dev
# or from project root
make frontend-dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

### Linting & Formatting
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting
- `npm run type-check` - Run TypeScript type checking

## Testing

This project uses **Vitest** and **React Testing Library** for testing.

### Writing Tests

Create test files next to your components with `.test.tsx` or `.test.ts` extension:

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Testing Best Practices

1. **Use Testing Library queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
   - Query by user-visible text and ARIA roles

2. **Test user behavior, not implementation**
   - Test what users see and do
   - Avoid testing internal state or implementation details

3. **Use user-event for interactions**
   ```typescript
   import userEvent from '@testing-library/user-event'
   
   const user = userEvent.setup()
   await user.click(screen.getByRole('button'))
   ```

4. **Mock API calls**
   ```typescript
   import { vi } from 'vitest'
   
   vi.mock('@/api/recipes', () => ({
     fetchRecipes: vi.fn().mockResolvedValue([...])
   }))
   ```

### Running Tests

```bash
# Watch mode (recommended for development)
npm test

# Run once with coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

## Code Quality

### ESLint

ESLint is configured with:
- React recommended rules
- TypeScript recommended rules
- React Hooks rules
- React Refresh plugin

Run linting:
```bash
npm run lint        # Check for errors
npm run lint:fix    # Auto-fix errors
```

### Prettier

Prettier is configured for consistent code formatting:
- Single quotes
- No semicolons
- 2 space indentation
- 100 character line width

Format code:
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### TypeScript

Type checking is done separately from the build:
```bash
npm run type-check
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/       # Reusable components
│   │   ├── layout/       # Layout components (Navbar, Footer)
│   │   └── ui/           # Base UI components (shadcn/ui)
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── test/             # Test utilities and setup
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── .eslintrc.cjs         # ESLint configuration
├── .prettierrc           # Prettier configuration
├── vitest.config.ts      # Vitest configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Building for Production

```bash
npm run build
# or from project root
make frontend-build
```

The built files will be in the `dist/` directory.

## CI/CD

GitHub Actions workflow (`.github/workflows/frontend.yaml`) runs on every push:
- ESLint checking
- Prettier formatting check
- TypeScript type checking
- Unit tests with coverage
- Production build

## Authentication

The app uses JWT-based authentication:
- Login page at `/login`
- Protected routes require authentication
- Token stored in localStorage
- Auto-redirect to login on 401 responses

See `src/contexts/AuthContext.tsx` for implementation.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Type check: `npm run type-check`
7. Commit and push
8. Create a pull request

## Troubleshooting

### Port 5173 already in use
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9
```

### Tests failing with "document is not defined"
- Ensure `vitest.config.ts` has `environment: 'jsdom'`
- Check that `src/test/setup.ts` is imported correctly

### Type errors in tests
- Install `@types/node` for Node.js types
- Ensure `vitest/globals` is in `tsconfig.json` types array

### ESLint errors after updating dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```
