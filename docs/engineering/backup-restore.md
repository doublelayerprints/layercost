# Backup e restore — Supabase

**Stato:** T5.4.6 — 28/10/2026
**Ambito:** backup settimanale cifrato e procedura di restore del workspace condiviso
**Piano:** `docs/planning/t5.4-cloud-sync.md` §8.3 e §T5.4.6.2

Il piano Supabase **Free non include backup automatici**. Il backup è responsabilità del progetto: questo documento descrive il workflow settimanale, la cifratura e la procedura di restore verificata.

---

## 1. Cosa viene salvato

Il workflow `.github/workflows/backup.yml` produce due archivi PostgreSQL in formato custom:

| Archivio | Contenuto | Note |
| --- | --- | --- |
| `layercost-public-YYYY-MM-DD.dump.enc` | Tutte le tabelle dello schema `public` | Configurazione, preventivi, membership, `keepalive` |
| `layercost-auth-YYYY-MM-DD.dump.enc` | Dati di `auth.users` e `auth.identities` | Utenti e password hash; le sessioni non sono incluse |

Lo **schema** non è nel backup: viene ricreato dalle migrazioni in `supabase/migrations/`. Il backup è quindi **data-only** e va ripristinato dopo aver applicato le migrazioni.

Non vengono salvati:

- sessioni, refresh token e tabelle interne di Supabase Auth;
- schemi interni (`storage`, `vault`, `realtime`, ecc.);
- log e metriche;
- file in Storage (non usati dall'app).

---

## 2. Workflow

- **Frequenza:** ogni domenica alle 03:23 UTC, più `workflow_dispatch` manuale.
- **Connessione:** `SUPABASE_DB_URL` via **session pooler** (IPv4), con `sslmode=require`.
- **Client:** container `postgres:17`, allineato al server Supabase.
- **Cifratura:** AES-256-CBC con PBKDF2 e salt, chiave in `BACKUP_ENCRYPTION_KEY`.
- **Checksum:** SHA-256 per ogni archivio.
- **Conservazione:** artifact GitHub con retention **30 giorni**.
- **Alert:** se il workflow fallisce, apre o aggiorna l'issue `[ops] Supabase backup failed`; quando il backup torna verde la chiude.

Secret richiesti nel repository GitHub:

| Secret | Contenuto |
| --- | --- |
| `SUPABASE_DB_URL` | URL del session pooler, con password e `sslmode=require` |
| `BACKUP_ENCRYPTION_KEY` | Passphrase robusta per `openssl`; conservala fuori da GitHub |

La **service role key non serve** per il backup: `pg_dump` usa la connessione Postgres del session pooler.

---

## 3. Verifica di un backup

Scarica l'artifact dalla run e verifica il checksum:

```bash
sha256sum -c layercost-public-YYYY-MM-DD.dump.enc.sha256
sha256sum -c layercost-auth-YYYY-MM-DD.dump.enc.sha256
```

Decifra solo su una macchina fidata:

```bash
export BACKUP_ENCRYPTION_KEY='<passphrase>'
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in layercost-public-YYYY-MM-DD.dump.enc \
  -out public.dump \
  -pass env:BACKUP_ENCRYPTION_KEY

openssl enc -d -aes-256-cbc -pbkdf2 \
  -in layercost-auth-YYYY-MM-DD.dump.enc \
  -out auth.dump \
  -pass env:BACKUP_ENCRYPTION_KEY
```

Controlla il contenuto senza ripristinare:

```bash
pg_restore --list public.dump | head
pg_restore --list auth.dump | head
```

---

## 4. Restore

### 4.1 Preparazione

1. Crea un progetto Supabase Free nella stessa regione EU, oppure usa Supabase locale.
2. Applica tutte le migrazioni:
   - cloud: `npx supabase link --project-ref <ref>` e `npx supabase db push`;
   - locale: `npm run db:start` e `npm run db:reset`.
3. Disabilita temporaneamente l'accesso pubblico all'app, se il restore è in produzione.
4. Scarica e decifra gli archivi come nel §3.

### 4.2 Ordine di restore

Ripristina **prima auth**, poi **public**: `public.workspace_members` e i campi `created_by`/`updated_by` referenziano `auth.users`.

```bash
export RESTORE_DB_URL='postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require'

pg_restore --data-only --no-owner --no-privileges \
  -d "$RESTORE_DB_URL" auth.dump

pg_restore --data-only --no-owner --no-privileges \
  -d "$RESTORE_DB_URL" public.dump
```

Regole:

- Usa una connessione Postgres diretta o session pooler, non lo SQL editor, per `pg_restore`.
- Non usare `--disable-triggers` su `auth.users`: le tabelle auth sono di proprietà di `supabase_auth_admin`. Il backup è progettato per essere ripristinato senza disabilitare i trigger.
- `public.profiles` è nel dump `public` e non ha trigger applicativi su `auth.users`: il restore di auth seguito da public non duplica i nomi visibili.
- Se ripristini in un progetto esistente, svuota prima le tabelle `public` e gli utenti di test; non eseguire il restore sopra dati di produzione diversi.
- Le sessioni non sono incluse: dopo il restore gli utenti devono accedere di nuovo.

### 4.3 Verifica

```sql
select count(*) from public.workspaces;
select count(*) from public.workspace_members;
select count(*) from public.quotes;
select count(*) from public.profiles;
select count(*) from auth.users;
select count(*) from auth.identities;
```

Poi:

1. Accedi con i due account e verifica che il workspace condiviso sia visibile.
2. Apri un preventivo e controlla prezzi, snapshot e stato.
3. Crea e salva un preventivo di prova.
4. Esegui `npm run db:test` solo su un database locale: i test pgTAP inseriscono fixture e fanno rollback.
5. Se il progetto è cambiato, aggiorna `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` su Vercel e rideploya.

---

## 5. Restore verificato (28/10/2026)

La procedura è stata provata su Supabase locale:

1. Creati un utente, un workspace, una membership, una riga `settings` e un preventivo.
2. Eseguiti i due dump data-only (`public` e `auth.users`/`auth.identities`).
3. Eseguito `npm run db:reset` per svuotare il database.
4. Ripristinati prima `auth.dump` e poi `public.dump`.
5. Verificati i conteggi: **1 workspace, 1 utente, 1 membership, 1 settings, 1 preventivo**.

Il test conferma che l'ordine auth → public e l'assenza di `--disable-triggers` funzionano sul database Supabase locale.

**Primo backup di produzione (28/10/2026):** workflow `Supabase backup` eseguito con successo in 44s sul progetto `layercost-prod`. Artifact `supabase-backup-40748445045` scaricato; checksum SHA-256 verificato, entrambi gli archivi decifrati e `pg_restore --list` ha confermato le tabelle `public` e `auth`. Il backup conteneva il workspace reale e nessun utente di test residuo.

---

## 6. Limiti e sicurezza

- **Nessun PITR:** la granularità è settimanale; un errore nelle ultime 24 ore può richiedere l'export JSON dell'app.
- **Retention 30 giorni:** scarica periodicamente un artifact se vuoi conservarlo più a lungo.
- **Chiave di cifratura:** se perdi `BACKUP_ENCRYPTION_KEY`, gli archivi sono irrecuperabili. Conservala nel password manager aziendale, fuori dal repository.
- **Dati sensibili:** gli archivi contengono password hash, email e dati economici. Non caricarli su servizi pubblici e non committarli.
- **Più workspace:** il backup contiene tutte le righe del database, spazi personali compresi. Con ADR-0028 gli ID delle entità sono univoci solo all'interno dello spazio; un restore completo conserva i workspace, mentre un import parziale deve rispettare `(workspace_id, id)`.
- **Service role:** non viene usata dal workflow di backup e non deve entrare nel repository o nel bundle.

---

## 7. Riferimenti

- `.github/workflows/backup.yml` — workflow settimanale.
- `docs/engineering/workspace-runbook.md` — utenti, membership, offboarding e reset password.
- `docs/engineering/deployment.md` — env Vercel, rollback e release.
- `docs/planning/t5.4-cloud-sync.md` §8.3 — decisione e limiti del piano Free.
