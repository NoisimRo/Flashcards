#!/bin/bash
# ============================================
# FLASHCARDS - Setup Google Cloud (prima dată)
# ============================================
# Rulează acest script o singură dată pentru a configura
# toate resursele necesare în Google Cloud
# ============================================

set -e

# Configurare - MODIFICĂ ACESTE VALORI!
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-your-project-id}"
REGION="europe-west1"
DB_PASSWORD="FlashcardsPass2024!"
DB_USER_PASSWORD="FlashUser2024!"

echo "╔════════════════════════════════════════════╗"
echo "║     🔧 Flashcards GCloud Setup            ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""
read -p "Continuă? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Setează proiectul
echo "📁 Setting project..."
gcloud config set project "$PROJECT_ID"

# 2. Activează API-urile necesare
echo "🔌 Enabling APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com

# 3. Creează Artifact Registry
echo "📦 Creating Artifact Registry..."
gcloud artifacts repositories create flashcards \
    --repository-format=docker \
    --location="$REGION" \
    --description="Flashcards Docker images" \
    2>/dev/null || echo "Repository already exists"

# 4. Creează Cloud SQL
echo "🗄️ Creating Cloud SQL instance (this takes 3-5 minutes)..."
gcloud sql instances create flashcards-db \
    --database-version=POSTGRES_17 \
    --tier=db-f1-micro \
    --edition=ENTERPRISE \
    --region="$REGION" \
    --root-password="$DB_PASSWORD" \
    2>/dev/null || echo "Instance already exists"

# 5. Creează baza de date și userul
echo "👤 Creating database and user..."
gcloud sql databases create flashcards --instance=flashcards-db 2>/dev/null || echo "Database already exists"
gcloud sql users create flashcards_user \
    --instance=flashcards-db \
    --password="$DB_USER_PASSWORD" \
    2>/dev/null || echo "User already exists"

# 6. Creează secretele
echo "🔐 Creating secrets..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CONNECTION_NAME=$(gcloud sql instances describe flashcards-db --format="value(connectionName)")

echo -n "/cloudsql/$CONNECTION_NAME" | gcloud secrets create flashcards-db-host --data-file=- 2>/dev/null || \
    echo -n "/cloudsql/$CONNECTION_NAME" | gcloud secrets versions add flashcards-db-host --data-file=-

echo -n "5432" | gcloud secrets create flashcards-db-port --data-file=- 2>/dev/null || true
echo -n "flashcards" | gcloud secrets create flashcards-db-name --data-file=- 2>/dev/null || true
echo -n "flashcards_user" | gcloud secrets create flashcards-db-user --data-file=- 2>/dev/null || true
echo -n "$DB_USER_PASSWORD" | gcloud secrets create flashcards-db-password --data-file=- 2>/dev/null || true
openssl rand -base64 32 | gcloud secrets create flashcards-jwt-access --data-file=- 2>/dev/null || true
openssl rand -base64 32 | gcloud secrets create flashcards-jwt-refresh --data-file=- 2>/dev/null || true

# 7. Dă permisiuni pentru secrete
echo "🔓 Granting secret access..."
for secret in flashcards-db-host flashcards-db-port flashcards-db-name flashcards-db-user flashcards-db-password flashcards-jwt-access flashcards-jwt-refresh; do
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || true
done

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     ✅ Setup complet!                     ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Următorii pași:"
echo "1. Conectează-te la DB și rulează schema:"
echo "   gcloud sql connect flashcards-db --user=postgres --database=flashcards"
echo "   (parola: $DB_PASSWORD)"
echo "   Apoi copiază conținutul din server/db/schema.sql"
echo ""
echo "2. Rulează deploy:"
echo "   ./scripts/deploy.sh"
echo ""
