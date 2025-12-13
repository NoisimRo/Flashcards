#!/bin/bash
# ============================================
# FLASHCARDS - Deploy Script pentru Google Cloud
# ============================================
# Utilizare: ./scripts/deploy.sh [version]
# ============================================

set -e

# Configurare
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gen-lang-client-0537064064}"
REGION="${CLOUD_RUN_REGION:-europe-west1}"
SERVICE_NAME="flashcards"
REPOSITORY="flashcards"
IMAGE_NAME="flashcards-app"

# Versiune (default: timestamp)
VERSION="${1:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_NAME:$VERSION"

echo "╔════════════════════════════════════════════╗"
echo "║     🚀 Flashcards Deploy Script           ║"
echo "╠════════════════════════════════════════════╣"
echo "║  Project:  $PROJECT_ID"
echo "║  Region:   $REGION"
echo "║  Version:  $VERSION"
echo "╚════════════════════════════════════════════╝"
echo ""

# Verifică dacă suntem autentificați
if ! gcloud auth print-access-token &> /dev/null; then
    echo "❌ Nu ești autentificat. Rulează: gcloud auth login"
    exit 1
fi

# Build cu Cloud Build
echo "🔨 Building Docker image..."
gcloud builds submit --tag "$IMAGE" --quiet

# Deploy pe Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --quiet

# Afișează URL-ul
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     ✅ Deploy complet!                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "🌐 URL aplicație:"
gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)"
echo ""
