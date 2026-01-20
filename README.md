# Flashcards - Evaluare Nationala

Aplicatie interactiva de flashcards pentru elevi si profesori, optimizata pentru pregatirea Evaluarii Nationale.

## Caracteristici

- **Multilingvă (i18n)**: Suport complet pentru Română, English, Italian
- **Sesiuni de Studiu Inteligente**: 4 metode de selectare (Random, Smart, Manual, All)
- **Separare Bibliotecă vs Sesiune**: Deck-uri permanente + sesiuni de studiu independente
- **Sistem de învățare cu repetitie spațiată (SM-2)**: Progres per utilizator
- **Gamificare**: XP, nivele, achievements, streak-uri, leaderboard
- **Generare automată de flashcards cu AI** (Gemini)
- **Auto-save progres**: Salvare automată la fiecare 30 secunde
- **Statistici detaliate** și progres per card
- **Import/Export** deck-uri (JSON, CSV, Anki)
- **Sistem de autentificare JWT** cu refresh tokens
- **Guest Mode**: Functionalitate completă fără cont (date salvate local)

## Tehnologii

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **I18n**: react-i18next (Română, English, Italiano)
- **State Management**: Zustand
- **Backend**: Node.js, Express 5, TypeScript
- **Database**: PostgreSQL 16
- **AI**: Google Gemini API
- **Containerizare**: Docker, Docker Compose
- **Cloud**: Google Cloud Run, Cloud SQL, Cloud Build

---

## Rulare Locala

### Optiunea 1: Cu Docker (recomandat)

```bash
# 1. Cloneaza repository-ul
git clone https://github.com/NoisimRo/Flashcards.git
cd Flashcards

# 2. Copiaza si configureaza variabilele de mediu
cp .env.example .env
# Editeaza .env cu valorile tale

# 3. Porneste cu Docker Compose
docker compose up -d

# 4. Aplicatia ruleaza la http://localhost:8080
```

### Optiunea 2: Development (fara Docker)

```bash
# 1. Porneste PostgreSQL (cu Docker)
docker compose -f docker-compose.dev.yml up -d

# 2. Instaleaza dependentele
npm install

# 3. Configureaza .env
cp .env.example .env

# 4. Initializeaza baza de date
npm run db:init

# 5. Porneste aplicatia (frontend + backend)
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Deployment pe Google Cloud

Vezi [DEPLOYMENT.md](DEPLOYMENT.md) pentru ghidul complet de deployment pe Google Cloud Platform.

### Quick Deploy

```bash
# Build si push imagine Docker
docker build -t europe-west1-docker.pkg.dev/PROJECT_ID/flashcards/app:latest .
docker push europe-west1-docker.pkg.dev/PROJECT_ID/flashcards/app:latest

# Deploy pe Cloud Run
gcloud run deploy flashcards \
  --image=europe-west1-docker.pkg.dev/PROJECT_ID/flashcards/app:latest \
  --region=europe-west1 \
  --allow-unauthenticated
```

---

## Structura Proiectului

```
flashcards/
├── src/                    # Cod sursa frontend
│   ├── components/        # Componente React (Atomic Design)
│   │   ├── layout/        # Layout components (Sidebar)
│   │   ├── pages/         # Page components (Dashboard, Settings, etc.)
│   │   ├── ui/            # UI components (Toast, LanguageSwitcher)
│   │   └── study-session/ # Study session components
│   ├── api/               # Client API calls
│   ├── store/             # Zustand stores
│   ├── i18n/              # Internationalization config
│   ├── routes/            # React routes
│   └── types/             # TypeScript types
├── public/locales/        # Translation files (ro, en, it)
├── server/                 # Backend Express
│   ├── config/            # Configurare server
│   ├── db/                # Schema PostgreSQL
│   ├── middleware/        # Middleware Express
│   └── routes/            # API routes
├── types.ts               # Shared TypeScript types
├── Dockerfile             # Container image
├── docker-compose.yml     # Production compose
├── docker-compose.dev.yml # Development compose
├── cloudbuild.yaml        # CI/CD Google Cloud
└── DEPLOYMENT.md          # Ghid deployment
```

---

## Variabile de Mediu

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flashcards
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_ACCESS_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-secret-min-32-chars

# AI (optional)
API_KEY=your_gemini_api_key
```

---

## API Endpoints

### Autentificare

| Endpoint             | Metoda | Descriere               |
| -------------------- | ------ | ----------------------- |
| `/api/auth/register` | POST   | Înregistrare utilizator |
| `/api/auth/login`    | POST   | Autentificare           |
| `/api/auth/refresh`  | POST   | Refresh access token    |

### Deck-uri

| Endpoint               | Metoda         | Descriere           |
| ---------------------- | -------------- | ------------------- |
| `/api/decks`           | GET/POST       | Listă / Creare deck |
| `/api/decks/:id`       | GET/PUT/DELETE | Operații deck       |
| `/api/decks/:id/cards` | GET/POST       | Gestionare carduri  |

### Sesiuni de Studiu (NOU!)

| Endpoint                           | Metoda   | Descriere                |
| ---------------------------------- | -------- | ------------------------ |
| `/api/study-sessions`              | GET/POST | Listă / Creare sesiune   |
| `/api/study-sessions/:id`          | GET/PUT  | Detalii / Update progres |
| `/api/study-sessions/:id/complete` | POST     | Finalizare sesiune       |
| `/api/study-sessions/:id`          | DELETE   | Abandon sesiune          |

---

## Development Workflow

Acest proiect foloseste un workflow automatizat pentru a asigura calitatea codului.

### Comenzi Disponibile

```bash
# Development
npm run dev          # Porneste frontend + backend
npm run dev:client   # Doar frontend (Vite)
npm run dev:server   # Doar backend (Express)

# Quality Checks
npm run typecheck    # Verificare TypeScript
npm run lint         # ESLint
npm run lint:fix     # ESLint cu auto-fix
npm run format       # Prettier format
npm run format:check # Verificare format

# Testing
npm run test         # Ruleaza toate testele
npm run test:watch   # Teste in mod watch
npm run test:coverage # Teste cu coverage report
npm run test:ui      # Vitest UI

# Build
npm run build        # Build frontend
npm run build:server # Build backend

# All-in-one validation
npm run validate     # typecheck + lint + test
```

### Pre-commit Hooks (Husky)

Proiectul foloseste Husky pentru automatizarea verificarilor:

| Hook           | Actiune                                                         |
| -------------- | --------------------------------------------------------------- |
| **pre-commit** | Ruleaza lint-staged (ESLint + Prettier pe fisierele modificate) |
| **pre-push**   | Ruleaza typecheck + teste                                       |
| **commit-msg** | Valideaza formatul commit-ului (Conventional Commits)           |

### Conventional Commits

Toate commit-urile trebuie sa urmeze formatul:

```
<type>(<scope>): <description>
```

**Types valide:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Exemple:**

- `feat(cards): add shuffle algorithm`
- `fix(auth): resolve token expiration bug`
- `docs: update API documentation`
- `test(decks): add unit tests for deck operations`

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
├─────────────────────────────────────────────────────────────┤
│  Push/PR → TypeCheck → Lint → Test → Build → Docker Build  │
│                                                              │
│  Main Branch → All CI + Deploy to Cloud Run                 │
└─────────────────────────────────────────────────────────────┘
```

**Pull Request:**

1. Type check (TypeScript)
2. Lint (ESLint)
3. Format check (Prettier)
4. Tests (Vitest)
5. Build verification

**Deploy (main branch):**

1. Toate verificarile PR
2. Build Docker image
3. Push to Artifact Registry
4. Deploy to Cloud Run

### Structura Teste

```
tests/
├── setup.ts              # Configurare globala teste
├── components/           # Teste componente React
├── server/              # Teste backend
│   ├── auth.test.ts     # Autentificare
│   └── decks.test.ts    # Operatii deck-uri
└── utils/               # Teste utilitati
    └── helpers.test.ts  # Functii helper
```

---

## Contributing

1. **Fork** repository-ul
2. **Creeaza** un branch nou: `git checkout -b feat/amazing-feature`
3. **Commit** modificarile: `git commit -m "feat: add amazing feature"`
4. **Push** branch-ul: `git push origin feat/amazing-feature`
5. **Deschide** un Pull Request

> **Nota:** Asigura-te ca toate verificarile CI trec inainte de a solicita review.

---

## Feedback

Daca ai intrebari sau sugestii, deschide un [Issue](https://github.com/NoisimRo/Flashcards/issues) pe GitHub.

## Licenta

MIT License - vezi [LICENSE](LICENSE)
