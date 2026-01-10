# Migrații Bază de Date - Instrucțiuni Pas cu Pas

Data: 2026-01-09

## 📋 Ce Face Această Migrație?

Această migrație adaugă 4 funcționalități noi:

1. **Deck-uri Publice** - Toate deck-urile devin publice implicit
2. **Review-uri pentru Deck-uri** - Utilizatorii pot da rating și review la deck-urile altora
3. **Flag-uri pentru Carduri** - Utilizatorii pot marca carduri individuale pentru review (cu comentarii opționale)
4. **Flag-uri pentru Deck-uri** - Utilizatorii pot marca deck-uri întregi pentru review

## 🚀 Rulare Rapidă (Toate Migrările)

### Opțiunea 1: Script Master (RECOMANDAT)

Copiază și lipește în terminal:

```bash
cd /home/user/Flashcards/server/db/migrations
psql "$DATABASE_URL" -f run-all-migrations.sql
```

### Opțiunea 2: Individual (Pentru Debugging)

Dacă vrei să rulezi fiecare migrație separat:

```bash
cd /home/user/Flashcards/server/db/migrations

# 1. Deck-uri publice
psql "$DATABASE_URL" -f 01-make-decks-public.sql

# 2. Reviews
psql "$DATABASE_URL" -f 02-deck-reviews.sql

# 3. Card flags
psql "$DATABASE_URL" -f 03-card-flags.sql

# 4. Deck flags
psql "$DATABASE_URL" -f 04-deck-flags.sql
```

## ✅ Verificare După Migrație

Rulează acest query pentru a verifica că totul este OK:

```bash
psql "$DATABASE_URL" -c "
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('deck_reviews', 'card_flags', 'deck_flags')
ORDER BY tablename;
"
```

Ar trebui să vezi:

```
 tablename
--------------
 card_flags
 deck_flags
 deck_reviews
(3 rows)
```

## 📊 Structura Tabelelor Create

### 1. `deck_reviews`

- **id**: UUID (Primary Key)
- **deck_id**: UUID (Foreign Key → decks)
- **user_id**: UUID (Foreign Key → users)
- **rating**: INTEGER (1-5 stele)
- **comment**: TEXT (opțional)
- **created_at**, **updated_at**: TIMESTAMP

**Index-uri**:

- Pe deck_id, user_id, rating, created_at
- UNIQUE constraint pe (deck_id, user_id) - un user poate da 1 review per deck

**Trigger-uri**:

- Auto-update `updated_at` la modificare
- Auto-update `average_rating` și `review_count` în tabela `decks`

### 2. `card_flags`

- **id**: UUID (Primary Key)
- **card_id**: UUID (Foreign Key → cards)
- **deck_id**: UUID (Foreign Key → decks)
- **flagged_by_user_id**: UUID (Foreign Key → users)
- **comment**: TEXT (ex: "există și alte răspunsuri corecte: x, y, z")
- **status**: ENUM ('pending', 'under_review', 'resolved', 'dismissed')
- **reviewed_by_user_id**: UUID (Foreign Key → users) - profesorul care a reviewuit
- **reviewed_at**: TIMESTAMP
- **review_notes**: TEXT - notele profesorului
- **created_at**, **updated_at**: TIMESTAMP

**Index-uri**:

- Pe card_id, deck_id, flagged_by_user_id, status, reviewed_by_user_id
- Index special pe `status = 'pending'` pentru quick queries

**Trigger-uri**:

- Auto-update `updated_at`
- Auto-update `flag_count` în tabela `cards`

### 3. `deck_flags`

- **id**: UUID (Primary Key)
- **deck_id**: UUID (Foreign Key → decks)
- **flagged_by_user_id**: UUID (Foreign Key → users)
- **reason**: VARCHAR(100) - motiv predefinit
- **comment**: TEXT (opțional)
- **status**: ENUM ('pending', 'under_review', 'resolved', 'dismissed')
- **reviewed_by_user_id**: UUID (Foreign Key → users)
- **reviewed_at**: TIMESTAMP
- **review_notes**: TEXT
- **created_at**, **updated_at**: TIMESTAMP

**Index-uri**:

- Pe deck_id, flagged_by_user_id, status, reason, reviewed_by_user_id
- Index special pe `status = 'pending'`

**Trigger-uri**:

- Auto-update `updated_at`
- Auto-update `flag_count` în tabela `decks`

## 🎯 Coloane Noi Adăugate în Tabelele Existente

### Tabela `decks`:

- **is_public**: DEFAULT schimbat de la `false` → `true`
- **average_rating**: DECIMAL(3,2) - media rating-urilor (0.00 - 5.00)
- **review_count**: INTEGER - număr total de review-uri
- **flag_count**: INTEGER - număr de flag-uri pending

### Tabela `cards`:

- **flag_count**: INTEGER - număr de flag-uri pending

## 🔍 Query-uri Utile Pentru Profesori

### Vezi toate flag-urile pending pentru carduri:

```sql
SELECT
  cf.id,
  cf.comment,
  c.front,
  c.back,
  d.title as deck_title,
  u.name as flagged_by,
  cf.created_at
FROM card_flags cf
JOIN cards c ON c.id = cf.card_id
JOIN decks d ON d.id = cf.deck_id
JOIN users u ON u.id = cf.flagged_by_user_id
WHERE cf.status = 'pending'
ORDER BY cf.created_at DESC;
```

### Vezi toate flag-urile pending pentru deck-uri:

```sql
SELECT
  df.id,
  df.reason,
  df.comment,
  d.title as deck_title,
  u.name as flagged_by,
  df.created_at
FROM deck_flags df
JOIN decks d ON d.id = df.deck_id
JOIN users u ON u.id = df.flagged_by_user_id
WHERE df.status = 'pending'
ORDER BY df.created_at DESC;
```

### Top deck-uri după rating:

```sql
SELECT
  title,
  average_rating,
  review_count,
  flag_count
FROM decks
WHERE review_count > 0
  AND deleted_at IS NULL
ORDER BY average_rating DESC, review_count DESC
LIMIT 10;
```

## 🛡️ Siguranță & Rollback

Aceste migrații sunt **safe** - nu șterg date existente. Doar adaugă tabele și coloane noi.

Dacă vrei să faci rollback:

```sql
-- Șterge tabelele noi
DROP TABLE IF EXISTS deck_flags CASCADE;
DROP TABLE IF EXISTS card_flags CASCADE;
DROP TABLE IF EXISTS deck_reviews CASCADE;

-- Șterge enum-ul
DROP TYPE IF EXISTS flag_status CASCADE;

-- Revert deck-uri la private (opțional)
ALTER TABLE decks ALTER COLUMN is_public SET DEFAULT false;
UPDATE decks SET is_public = false WHERE deleted_at IS NULL;

-- Șterge coloanele noi din decks
ALTER TABLE decks
DROP COLUMN IF EXISTS average_rating,
DROP COLUMN IF EXISTS review_count,
DROP COLUMN IF EXISTS flag_count;

-- Șterge coloana nouă din cards
ALTER TABLE cards
DROP COLUMN IF EXISTS flag_count;
```

## 📞 Suport

Dacă întâmpini erori, verifică:

1. `DATABASE_URL` este setat corect: `echo $DATABASE_URL`
2. PostgreSQL rulează: `pg_isready`
3. Extensia uuid-ossp este activată: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

---

**Succes! 🎉**
