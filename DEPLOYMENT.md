# Deployment pe Google Cloud

Ghid complet pentru deployment-ul aplicației Flashcards pe Google Cloud Platform.

## Arhitectură

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GitHub Repository                                               │
│       │                                                          │
│       ▼ (push pe main/master)                                    │
│  ┌─────────────────┐                                            │
│  │ Cloud Build     │ ◄── CI/CD (cloudbuild.yaml)                │
│  │ Trigger         │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼ (build & push image)                                 │
│  ┌─────────────────┐                                            │
│  │ Artifact        │ ◄── Container Registry                     │
│  │ Registry        │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼ (deploy)                                             │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │ Cloud Run       │◄────►│ Cloud SQL       │                   │
│  │ (serverless)    │      │ (PostgreSQL)    │                   │
│  └────────┬────────┘      └─────────────────┘                   │
│           │                                                      │
│           ▼                                                      │
│  https://flashcards-xxxxx-ew.a.run.app                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pași de Configurare

### Pasul 1: Creează proiect Google Cloud

```bash
# Autentifică-te în Google Cloud
gcloud auth login

# Creează un proiect nou (sau folosește unul existent)
gcloud projects create flashcards-app --name="Flashcards App"

# Setează proiectul ca default
gcloud config set project flashcards-app

# Activează billing (necesar pentru Cloud Run)
# Acest pas trebuie făcut din Console: https://console.cloud.google.com/billing
```

### Pasul 2: Activează API-urile necesare

```bash
# Activează toate API-urile necesare
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com
```

### Pasul 3: Configurează Artifact Registry

```bash
# Creează repository pentru imagini Docker
gcloud artifacts repositories create flashcards \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Flashcards Docker images"

# Configurează Docker să folosească Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Pasul 4: Creează baza de date Cloud SQL

```bash
# Creează instanță PostgreSQL
gcloud sql instances create flashcards-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --root-password=YOUR_STRONG_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB

# Creează baza de date
gcloud sql databases create flashcards --instance=flashcards-db

# Creează user
gcloud sql users create flashcards_user \
  --instance=flashcards-db \
  --password=YOUR_USER_PASSWORD

# Obține connection name (îl vei folosi mai târziu)
gcloud sql instances describe flashcards-db --format="value(connectionName)"
```

### Pasul 5: Configurează Secretele

```bash
# Creează secretele în Secret Manager
echo -n "YOUR_DB_HOST" | gcloud secrets create flashcards-db-host --data-file=-
echo -n "5432" | gcloud secrets create flashcards-db-port --data-file=-
echo -n "flashcards" | gcloud secrets create flashcards-db-name --data-file=-
echo -n "flashcards_user" | gcloud secrets create flashcards-db-user --data-file=-
echo -n "YOUR_USER_PASSWORD" | gcloud secrets create flashcards-db-password --data-file=-

# JWT Secrets (generează valori random puternice!)
openssl rand -base64 32 | gcloud secrets create flashcards-jwt-access --data-file=-
openssl rand -base64 32 | gcloud secrets create flashcards-jwt-refresh --data-file=-

# Gemini API Key (opțional)
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create flashcards-gemini-key --data-file=-

# Dă permisiuni Cloud Build și Cloud Run să acceseze secretele
PROJECT_NUMBER=$(gcloud projects describe flashcards-app --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding flashcards-db-host \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repetă pentru toate secretele...
for secret in flashcards-db-host flashcards-db-port flashcards-db-name flashcards-db-user flashcards-db-password flashcards-jwt-access flashcards-jwt-refresh flashcards-gemini-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Pasul 6: Configurează Cloud Build Trigger

```bash
# Conectează repository-ul GitHub
# Acest pas trebuie făcut din Console:
# https://console.cloud.google.com/cloud-build/triggers

# Sau folosind CLI:
gcloud builds triggers create github \
  --repo-name=Flashcards \
  --repo-owner=NoisimRo \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --name="flashcards-deploy"
```

### Pasul 7: Inițializează baza de date

```bash
# Conectează-te la Cloud SQL și rulează schema
gcloud sql connect flashcards-db --user=flashcards_user

# În terminal-ul PostgreSQL:
\i server/db/schema.sql
```

### Pasul 8: Deploy manual (prima dată)

```bash
# Build local
docker build -t europe-west1-docker.pkg.dev/flashcards-app/flashcards/flashcards-app:v1 .

# Push imagine
docker push europe-west1-docker.pkg.dev/flashcards-app/flashcards/flashcards-app:v1

# Deploy pe Cloud Run
gcloud run deploy flashcards \
  --image=europe-west1-docker.pkg.dev/flashcards-app/flashcards/flashcards-app:v1 \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --set-secrets=DB_HOST=flashcards-db-host:latest,DB_PASSWORD=flashcards-db-password:latest
```

---

## Costuri Estimate

| Serviciu          | Tier        | Cost estimat/lună        |
| ----------------- | ----------- | ------------------------ |
| Cloud Run         | Free tier   | $0 (până la 2M requests) |
| Cloud SQL         | db-f1-micro | ~$7-10                   |
| Artifact Registry | Standard    | ~$0.10/GB                |
| Cloud Build       | Free tier   | $0 (până la 120 min/zi)  |
| **TOTAL**         |             | **~$10-15/lună**         |

> **Notă:** Poți reduce costurile folosind Cloud SQL cu connection pooling sau trecând la o bază de date externă (Supabase, Neon, etc.)

---

## CI/CD Flow

După configurare, workflow-ul este automat:

1. **Push pe `main`** → Cloud Build trigger se activează
2. **Build** → Docker image se construiește
3. **Push** → Imaginea se uploadează în Artifact Registry
4. **Deploy** → Cloud Run primește noua versiune
5. **Ready** → Aplicația e disponibilă la URL-ul Cloud Run

---

## Comenzi Utile

```bash
# Vezi logs Cloud Run
gcloud run services logs read flashcards --region=europe-west1

# Vezi status deployment
gcloud run services describe flashcards --region=europe-west1

# Rollback la versiune anterioară
gcloud run services update-traffic flashcards --to-revisions=REVISION_NAME=100

# Scalare manuală
gcloud run services update flashcards --min-instances=1 --max-instances=5

# Obține URL-ul aplicației
gcloud run services describe flashcards --region=europe-west1 --format="value(status.url)"
```

---

## Troubleshooting

### Eroare: "Permission denied"

```bash
# Verifică permisiunile service account
gcloud projects get-iam-policy flashcards-app
```

### Eroare: "Database connection failed"

```bash
# Verifică că Cloud SQL Admin API e activat
gcloud services enable sqladmin.googleapis.com

# Verifică connection name
gcloud sql instances describe flashcards-db --format="value(connectionName)"
```

### Eroare: "Secret not found"

```bash
# Listează secretele
gcloud secrets list

# Verifică permisiunile
gcloud secrets get-iam-policy flashcards-db-password
```

---

## Alternativă: Cloud SQL Auth Proxy

Pentru conexiune mai sigură la Cloud SQL:

```bash
# În cloudbuild.yaml, adaugă Cloud SQL Proxy
gcloud run deploy flashcards \
  --add-cloudsql-instances=flashcards-app:europe-west1:flashcards-db \
  --set-env-vars=DB_HOST=/cloudsql/flashcards-app:europe-west1:flashcards-db
```
