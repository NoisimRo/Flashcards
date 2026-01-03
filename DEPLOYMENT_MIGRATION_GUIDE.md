# 🚀 Ghid Deployment - Refactoring Study Sessions

## ⚠️ IMPORTANT: Read Before Deployment

Acest ghid te ajută să migrezi aplicația în producție (Google Cloud) cu noua arhitectură pentru study sessions.

**Ce s-a schimbat**:

- ✅ Database schema (2 tabele noi, modificări la `cards` și `decks`)
- ✅ Backend API (7 endpoint-uri noi pentru study sessions)
- ✅ TypeScript types (interfețe noi pentru sesiuni)
- ✅ State management (Zustand stores)
- ⏳ UI Components (opțional - vor fi adăugate în PR viitor)

---

## 📋 Prerequisites

Asigură-te că ai:

- [x] Acces la Google Cloud Console
- [x] `gcloud` CLI instalat și autentificat
- [x] Acces la Cloud SQL instance
- [x] Backup recent al bazei de date

---

## 🗂️ Partea 1: Pregătire Locală

### Step 1: Creează Backup Local

```bash
# Conectează-te la DB production și salvează backup
gcloud sql export sql flashcards-db \
  gs://flashcards-backups/backup-before-migration-$(date +%Y%m%d-%H%M%S).sql \
  --database=flashcards
```

### Step 2: Test Migrarea pe Local

```bash
# Rulează migrarea pe DB locală pentru test
psql "postgresql://postgres:PASSWORD@localhost:5432/flashcards" \
  -f server/db/migrations/001_refactor_sessions.sql

# Verifică schema
psql "postgresql://postgres:PASSWORD@localhost:5432/flashcards" \
  -c "\d user_card_progress"
psql "postgresql://postgres:PASSWORD@localhost:5432/flashcards" \
  -c "\d study_sessions"
```

**Verificări**:

- ✅ Tabelul `user_card_progress` există
- ✅ Tabelul `study_sessions` are noile coloane
- ✅ Tabelul `cards` NU mai are coloanele SM-2
- ✅ Tabelul `decks` NU mai are `mastered_cards`

---

## 🗄️ Partea 2: Migrare Database Production

### Step 1: Conectează-te la Cloud SQL

```bash
# Găsește connection name
gcloud sql instances describe flashcards-db --format="value(connectionName)"
# Output: PROJECT_ID:REGION:flashcards-db

# Pornește Cloud SQL Proxy
cloud_sql_proxy -instances=PROJECT_ID:REGION:flashcards-db=tcp:5433 &

# Sau conectează-te direct prin gcloud
gcloud sql connect flashcards-db --user=postgres --database=flashcards
```

### Step 2: Rulează Migrarea

**Opțiunea A: Direct cu psql**

```bash
# Conectează prin proxy
PGPASSWORD="YOUR_PROD_PASSWORD" psql \
  -h 127.0.0.1 \
  -p 5433 \
  -U postgres \
  -d flashcards \
  -f server/db/migrations/001_refactor_sessions.sql
```

**Opțiunea B: Upload script în Cloud Storage apoi execute**

```bash
# Upload migration script
gsutil cp server/db/migrations/001_refactor_sessions.sql gs://flashcards-scripts/

# Execute via Cloud SQL
gcloud sql import sql flashcards-db \
  gs://flashcards-scripts/001_refactor_sessions.sql \
  --database=flashcards
```

### Step 3: Verifică Migrarea

```bash
# Conectează-te la DB
gcloud sql connect flashcards-db --user=postgres --database=flashcards

# Rulează verificări
\d user_card_progress
\d study_sessions
\d cards
\d decks

# Verifică că nu există erori
SELECT COUNT(*) FROM user_card_progress;  -- Should be 0 (new table)
SELECT COUNT(*) FROM study_sessions;      -- Should be 0 (recreated)
SELECT COUNT(*) FROM cards;               -- Should have existing cards
SELECT COUNT(*) FROM decks;               -- Should have existing decks
```

---

## 🏗️ Partea 3: Deploy Backend & Frontend

### Step 1: Merge PR în Main

```bash
# Creează PR din branch
git checkout claude/fix-flashcard-persistence-nunHL
# Merge PR pe GitHub UI

# Sau merge direct (dacă ai rights)
git checkout main
git merge claude/fix-flashcard-persistence-nunHL
git push origin main
```

### Step 2: Verifică Cloud Build Trigger

```bash
# Listează triggers
gcloud builds triggers list

# Cloud Build va detecta push pe main și va porni build automat
# Monitorizează build-ul
gcloud builds list --ongoing
```

### Step 3: Monitorizează Deployment

```bash
# Vezi logs de la Cloud Build
gcloud builds log <BUILD_ID> --stream

# Vezi logs de la Cloud Run (după deploy)
gcloud run services logs read flashcards-service \
  --region=europe-west1 \
  --limit=50 \
  --format="table(timestamp,textPayload)"
```

---

## ✅ Partea 4: Verificări Post-Deployment

### 1. Health Check

```bash
# Test health endpoint
curl https://YOUR_APP_URL/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "database": "connected"
# }
```

### 2. Test Endpoints

```bash
# Test new study sessions endpoint (requires auth token)
TOKEN="your_jwt_token"

# List sessions
curl -H "Authorization: Bearer $TOKEN" \
  https://YOUR_APP_URL/api/study-sessions

# Create session
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deckId": "DECK_ID",
    "selectionMethod": "random",
    "cardCount": 10,
    "excludeMasteredCards": true
  }' \
  https://YOUR_APP_URL/api/study-sessions
```

### 3. Test în Browser

1. Deschide aplicația
2. Login cu un cont de test
3. Navighează la Decks
4. Verifică că deck-urile se încarcă corect
5. (După UI implementation) Testează crearea unei sesiuni

---

## 🔄 Rollback Plan (Dacă Ceva Merge Rău)

### Rollback Database

```bash
# Rulează rollback script
PGPASSWORD="YOUR_PROD_PASSWORD" psql \
  -h 127.0.0.1 \
  -p 5433 \
  -U postgres \
  -d flashcards \
  -f server/db/migrations/001_refactor_sessions_rollback.sql
```

### Rollback Code

```bash
# Revert commit pe main
git revert <COMMIT_SHA>
git push origin main

# Cloud Build va redeploya versiunea veche
```

### Restore Database din Backup

```bash
# Restabilește din backup
gcloud sql import sql flashcards-db \
  gs://flashcards-backups/backup-before-migration-TIMESTAMP.sql \
  --database=flashcards
```

---

## 📝 Checklist Final

### Pre-Deployment

- [ ] Backup database creat
- [ ] Migrare testată local
- [ ] Code formatat și verificat
- [ ] PR reviewed și approved

### During Deployment

- [ ] Migrare DB executată cu succes
- [ ] PR merged în main
- [ ] Cloud Build succeeded
- [ ] Cloud Run deployment succeeded

### Post-Deployment

- [ ] Health check passes
- [ ] Database connections working
- [ ] API endpoints responding
- [ ] Frontend loads without errors
- [ ] Test user can login
- [ ] Decks load correctly

### Cleanup

- [ ] Cloud SQL Proxy stopped
- [ ] Local branch șters (opțional)
- [ ] Documentation updated

---

## 🆘 Troubleshooting

### Database Connection Errors

```bash
# Verifică firewall rules
gcloud sql instances describe flashcards-db --format="value(settings.ipConfiguration)"

# Verifică autorizarea
gcloud sql users list --instance=flashcards-db
```

### Build Failures

```bash
# Vezi detalii build
gcloud builds describe <BUILD_ID>

# Verifică secrets
gcloud secrets versions access latest --secret="DATABASE_URL"
```

### Runtime Errors

```bash
# Streaming logs
gcloud run services logs tail flashcards-service --region=europe-west1

# Verifică environment variables
gcloud run services describe flashcards-service --region=europe-west1 --format="value(spec.template.spec.containers[0].env)"
```

---

## 📞 Support

Dacă întâmpini probleme:

1. Verifică logs: Cloud Build → Cloud Run → Cloud SQL
2. Rulează health check
3. Verifică database schema
4. Consultă acest ghid pentru rollback

---

**Data ultimei actualizări**: January 2, 2026
**Versiune**: 1.0.0 - Initial Migration Guide
