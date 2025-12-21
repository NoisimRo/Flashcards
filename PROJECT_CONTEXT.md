# Project Context - Flashcards Evaluare Nationala

> This document provides context for AI assistants and developers working on this project.
> Last updated: December 2024

## Project Purpose & Scope

**Flashcards Evaluare Nationala** is an interactive flashcard application designed for Romanian students preparing for the National Evaluation exam (Evaluare Nationala). It provides:

- Flashcard creation and study with spaced repetition (SM-2 algorithm)
- Gamification: XP, levels, achievements, streaks, leaderboards
- AI-powered flashcard generation via Google Gemini
- Freemium model with guest access and authenticated user features
- Offline support with sync capabilities

**Target Users**: Romanian students (primarily 8th grade) and teachers.

---

## Tech Stack

### Frontend

| Technology   | Version   | Purpose                 |
| ------------ | --------- | ----------------------- |
| React        | 19.x      | UI framework            |
| TypeScript   | 5.8.x     | Type safety             |
| Vite         | 6.x       | Build tool & dev server |
| TailwindCSS  | (via CDN) | Styling                 |
| Lucide React | 0.559.x   | Icons                   |
| Recharts     | 3.5.x     | Charts/graphs           |

### Backend

| Technology | Version | Purpose          |
| ---------- | ------- | ---------------- |
| Node.js    | 20.x    | Runtime          |
| Express    | 5.x     | Web framework    |
| PostgreSQL | 16.x    | Database         |
| JWT        | -       | Authentication   |
| bcryptjs   | -       | Password hashing |

### Infrastructure

| Technology         | Purpose              |
| ------------------ | -------------------- |
| Docker             | Containerization     |
| Google Cloud Run   | Hosting              |
| Google Cloud SQL   | Managed PostgreSQL   |
| Google Cloud Build | CI/CD                |
| GitHub Actions     | Additional CI checks |

### Development Tools

| Tool        | Purpose               |
| ----------- | --------------------- |
| Vitest      | Testing framework     |
| ESLint 9    | Linting (flat config) |
| Prettier    | Code formatting       |
| Husky       | Git hooks             |
| lint-staged | Pre-commit checks     |

---

## Architecture

### Directory Structure

```
/
├── App.tsx                 # Main React component (monolithic, ~540 lines)
├── index.tsx               # React entry point
├── types.ts                # Shared TypeScript types
├── constants.ts            # Mock data and constants
│
├── components/             # Top-level React components
│   ├── Dashboard.tsx       # User dashboard with stats
│   ├── DeckList.tsx        # Deck management
│   ├── StudySession.tsx    # Card study flow (~1000 lines)
│   ├── Achievements.tsx    # Gamification badges
│   ├── Leaderboard.tsx     # User rankings
│   ├── Settings.tsx        # User preferences
│   └── Sidebar.tsx         # Navigation
│
├── src/                    # Source modules (newer organization)
│   ├── api/                # API client functions
│   ├── components/         # Shared UI components (Toast, Auth)
│   ├── data/seed/          # Seed data JSON files
│   ├── services/           # Offline storage, sync
│   ├── store/              # AuthContext (React Context)
│   └── types/              # Additional type definitions
│
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── config/             # Environment config
│   ├── db/                 # Database connection & schema
│   ├── middleware/         # Auth middleware
│   └── routes/             # API routes (auth, users, decks, import-export)
│
├── services/               # Backend services
│   └── geminiService.ts    # AI integration
│
├── tests/                  # Test files
│   ├── setup.ts            # Vitest setup
│   ├── server/             # API route tests
│   └── utils/              # Helper function tests
│
├── .github/workflows/      # GitHub Actions CI/CD
├── scripts/                # Deployment scripts
└── docker-compose*.yml     # Docker configurations
```

### Architecture Patterns

1. **Monorepo-ish**: Frontend and backend in same repo, built together
2. **Express + React SPA**: Backend serves API + static React build in production
3. **React Context**: Auth state managed via `AuthContext`
4. **API Adapter Pattern**: `adaptUserFromAPI()` / `adaptDeckFromAPI()` convert API responses
5. **Freemium Model**: Guest users get mock data, authenticated users get real data
6. **JWT Auth**: Access + refresh token pattern with secure httpOnly considerations

### Observed Code Conventions

- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Files**: .tsx for React, .ts for pure TypeScript
- **Comments**: Romanian language in code comments and UI
- **API Responses**: `{ success: boolean, data?: T, error?: { code, message } }`
- **Error Messages**: Romanian language for user-facing errors

---

## Current State

### Implemented Features

- [x] User authentication (register, login, logout, refresh tokens)
- [x] Deck CRUD operations
- [x] Card study session with SM-2 algorithm
- [x] XP and leveling system
- [x] Achievements system
- [x] Leaderboard (global and by subject)
- [x] Import/Export decks (JSON, CSV)
- [x] AI card generation (Gemini integration)
- [x] Toast notification system
- [x] Offline storage (IndexedDB)
- [x] Sync service (partial)
- [x] Docker containerization
- [x] Google Cloud Run deployment
- [x] CI/CD with GitHub Actions + Cloud Build

### Partially Implemented / In Progress

- [ ] Sync service - queue exists but full conflict resolution incomplete
- [ ] Subject filtering in deck list
- [ ] Teacher/Admin roles - DB schema exists, UI limited
- [ ] Sound effects for gamification
- [ ] Localization system (hardcoded Romanian)

### Known Technical Debt

1. **Large Components**: `App.tsx` (540 lines), `StudySession.tsx` (1000 lines) need splitting
2. **Dual Component Locations**: Components in both `/components/` and `/src/components/`
3. **Mock Data Mixed with Real**: `constants.ts` has mock data used as fallback
4. **Type Duplication**: Types defined in `/types.ts`, `/src/types/`, and inline
5. **CSS**: TailwindCSS via CDN, no purging for production
6. **Husky Deprecation Warnings**: Husky hooks have deprecated syntax

---

## Environment Variables

Required in `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flashcards
DB_USER=flashcards_user
DB_PASSWORD=your_password

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Optional
GEMINI_API_KEY=your_gemini_key  # For AI features
```

---

## Quick Commands

```bash
# Development
npm run dev              # Start frontend + backend
npm run dev:client       # Frontend only (port 5173)
npm run dev:server       # Backend only (port 3000)

# Quality
npm run typecheck        # TypeScript validation
npm run lint             # ESLint check
npm run format           # Prettier format
npm run test             # Run tests
npm run validate         # All checks

# Build
npm run build            # Build frontend
npm run build:server     # Compile server TypeScript

# Database
npm run db:init          # Initialize PostgreSQL schema
```

---

## Deployment

- **Production URL**: Cloud Run service in `europe-west1`
- **CI/CD Trigger**: Push to `main` branch
- **Build Process**: `cloudbuild.yaml` runs tests → builds Docker → deploys to Cloud Run
- **Secrets**: Managed via Google Secret Manager

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.
