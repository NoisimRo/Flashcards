# Flashcards - Evaluare Nationala

Aplicatie interactiva de flashcards pentru elevi si profesori, optimizata pentru pregatirea Evaluarii Nationale.

## Caracteristici

- Creare si gestionare deck-uri de flashcards
- Sistem de invatare cu repetitie spatiata (SM-2)
- Gamificare: XP, nivele, achievements, streak-uri
- Generare automata de flashcards cu AI (Gemini)
- Statistici detaliate si progres
- Import/Export deck-uri
- Sistem de autentificare JWT

## Tehnologii

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
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
├── src/                    # Cod sursa React
├── components/             # Componente React
├── services/               # Servicii (API calls)
├── server/                 # Backend Express
│   ├── config/            # Configurare server
│   ├── db/                # Schema PostgreSQL
│   ├── middleware/        # Middleware Express
│   └── routes/            # API routes
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

| Endpoint | Metoda | Descriere |
|----------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Inregistrare |
| `/api/auth/login` | POST | Autentificare |
| `/api/decks` | GET/POST | Gestionare deck-uri |
| `/api/decks/:id/cards` | GET/POST | Gestionare carduri |

---

## Feedback

Daca ai intrebari sau sugestii, deschide un [Issue](https://github.com/NoisimRo/Flashcards/issues) pe GitHub.

## Licenta

MIT License - vezi [LICENSE](LICENSE)
