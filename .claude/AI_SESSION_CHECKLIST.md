# AI Session Checklist

Quick reference for Claude Code sessions to avoid common issues.

## ⚠️ BEFORE EVERY COMMIT

```bash
npm run format
```

**This is MANDATORY.** CI will fail if files are not formatted.

## Session Workflow

### 1. Start Session

```bash
git status                    # Check current state
git log --oneline -5          # Review recent commits
npm run validate              # Ensure clean state
```

### 2. During Development

```bash
npm run dev                   # Start dev server
npm run test:watch            # Run tests in watch mode
```

### 3. Before Committing

```bash
npm run format                # ← CRITICAL: Format all files
npm run validate              # TypeCheck + Lint + Test
git add .
git commit -m "type(scope): message"
```

### 4. End Session

```bash
npm run format                # ← Format again to be safe
git push -u origin branch-name
# Update TODO.md with session notes
```

## Common CI Failures

### ❌ Prettier Format Error

```bash
npm run format
git add .
git commit -m "fix: format files with Prettier"
git push
```

### ❌ ESLint Error

```bash
npm run lint:fix
git add .
git commit -m "fix: resolve ESLint warnings"
git push
```

### ❌ TypeScript Error

```bash
npm run typecheck              # See all errors
# Fix errors in code
git add .
git commit -m "fix: resolve TypeScript errors"
git push
```

### ❌ Test Failures

```bash
npm run test                   # See failing tests
# Fix tests or implementation
git add .
git commit -m "fix: resolve failing tests"
git push
```

## Quick Commands Reference

| Command              | Purpose                             |
| -------------------- | ----------------------------------- |
| `npm run format`     | **MUST RUN BEFORE EVERY COMMIT**    |
| `npm run validate`   | Run all checks (type + lint + test) |
| `npm run dev`        | Start development server            |
| `npm run build`      | Build production bundle             |
| `npm run test`       | Run all tests                       |
| `npm run test:watch` | Run tests in watch mode             |
| `npm run lint`       | Check for ESLint errors             |
| `npm run lint:fix`   | Auto-fix ESLint errors              |
| `npm run typecheck`  | Check TypeScript types              |

## Remember

- **ALWAYS** run `npm run format` before committing
- Check `TODO.md` for current priorities
- Update `TODO.md` at end of session with completed work
- Keep commits focused and atomic
- Use conventional commit messages
