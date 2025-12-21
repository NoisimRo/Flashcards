# Contributing Guide

Guidelines for maintaining consistency across development sessions, whether human or AI-assisted.

---

## Development Workflow

### 1. Before Starting Work

```bash
# Always start from main with latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
# or for fixes:
git checkout -b fix/issue-description
```

### 2. Development Cycle

```bash
# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Run validation before committing
npm run validate  # typecheck + lint + test
```

### 3. Commit Convention

Use **Conventional Commits** format:

```
type(scope): description

[optional body]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `test`: Adding/updating tests
- `chore`: Build, config, dependencies
- `ci`: CI/CD changes

**Examples**:

```bash
git commit -m "feat(auth): add password reset flow"
git commit -m "fix(study): correct XP calculation on streak bonus"
git commit -m "refactor(dashboard): extract stats component"
```

### 4. Pull Request Process

1. Push your branch: `git push -u origin feature/your-feature-name`
2. Create PR targeting `main`
3. Ensure all CI checks pass
4. Request review (or self-review for AI sessions)
5. Merge via GitHub UI (squash or merge commit)

---

## Git Strategy

### Branch Structure

```
main                    # Production-ready code
├── feature/*           # New features
├── fix/*               # Bug fixes
├── refactor/*          # Code improvements
└── claude/*            # AI-assisted development sessions
```

### Protected Branch: `main`

- All changes via Pull Request
- CI must pass before merge
- Direct pushes blocked (except for emergency fixes)

### Handling AI Sessions

Claude Code sessions use branches like `claude/description-sessionId`. These follow the same PR process:

1. AI develops on `claude/*` branch
2. Pushes changes
3. Creates PR to `main`
4. CI validates
5. Human reviews and merges

---

## Code Quality Standards

### Pre-commit Checks (Automated via Husky)

- ESLint on `.ts`, `.tsx` files
- Prettier formatting
- Commit message validation

### Pre-push Checks

- TypeScript type checking
- Test suite execution

### CI Pipeline

Every PR runs:

1. TypeScript check
2. ESLint
3. Prettier format check
4. Vitest tests
5. Build verification
6. Docker build test

---

## Testing Approach

### Current Coverage

| Area          | Coverage | Notes                         |
| ------------- | -------- | ----------------------------- |
| API Routes    | Partial  | Auth, Decks routes            |
| Utils/Helpers | Good     | Type validation, calculations |
| Components    | Minimal  | Setup exists, tests needed    |
| E2E           | None     | Future consideration          |

### Writing Tests

```typescript
// tests/[area]/[feature].test.ts
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should behave correctly', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Running Tests

```bash
npm run test              # Single run
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:ui           # Visual UI
```

---

## Code Style Guidelines

### TypeScript

- Use strict types, avoid `any` (warnings allowed for legacy)
- Prefer interfaces over types for objects
- Use nullish coalescing (`??`) over OR (`||`) for defaults
- Export types alongside implementations

### React Components

```typescript
// Preferred structure
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export function Component({ prop1, prop2 = 0 }: ComponentProps) {
  // hooks first
  const [state, setState] = useState();

  // derived values
  const computed = useMemo(() => ..., [deps]);

  // handlers
  const handleClick = useCallback(() => ..., [deps]);

  // effects
  useEffect(() => ..., [deps]);

  // render
  return (...);
}
```

### File Organization

- One component per file (matching filename)
- Co-locate tests: `Component.tsx` → `Component.test.tsx`
- Group related utilities in `/src/services/` or `/src/utils/`

---

## Session Handoff Protocol

For AI-assisted development sessions, ensure continuity:

### At Session End

1. **Commit all changes** with clear messages
2. **Push to remote** branch
3. **Update TODO.md** with:
   - What was completed
   - What's in progress
   - Blockers or decisions needed

### At Session Start

1. Read `PROJECT_CONTEXT.md` for overview
2. Check `TODO.md` for current priorities
3. Review recent commits: `git log --oneline -10`
4. Check for open PRs or issues
5. Run `npm run validate` to ensure clean state

### Handoff Checklist

```markdown
## Session Summary - [Date]

### Completed

- [ ] Feature/fix description

### In Progress

- [ ] Item with current state

### Blockers

- [ ] Issue requiring human decision

### Next Steps

1. Recommended next action
2. ...
```

---

## Common Tasks

### Adding a New API Endpoint

1. Add route handler in `server/routes/[resource].ts`
2. Add types in `src/types/api.ts`
3. Add client function in `src/api/[resource].ts`
4. Add tests in `tests/server/[resource].test.ts`

### Adding a New Component

1. Create in appropriate location:
   - UI/shared: `src/components/ui/`
   - Feature: `components/` or `src/components/[feature]/`
2. Add types inline or in `types.ts`
3. Export from component file

### Updating Database Schema

1. Modify `server/db/schema.sql`
2. Create migration script (manual for now)
3. Update relevant TypeScript types
4. Test with fresh database

---

## Troubleshooting

### CI Fails on npm ci

Ensure `package-lock.json` is committed and up to date:

```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

### Type Errors

```bash
npm run typecheck  # See all errors
```

### ESLint Errors

```bash
npm run lint       # See errors
npm run lint:fix   # Auto-fix what's possible
```

### Test Failures

```bash
npm run test:watch  # Debug in watch mode
```
