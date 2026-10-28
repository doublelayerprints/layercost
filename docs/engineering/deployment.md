# Deployment

**Stato:** v1.0.0 — Vercel, build statica

---

## 1. Vercel

**Live:** https://layercost.vercel.app

Repo GitHub: **https://github.com/doublelayerprints/layercost** (privata).

1. Apri [vercel.com/new](https://vercel.com/new).
2. Importa `doublelayerprints/layercost`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Node: 22.x.
7. Nessuna variabile d'ambiente obbligatoria. Il cloud opzionale usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY`); se mancano, l'app resta local-only. Vedi `.env.example`.
8. Deploy.

In alternativa, dal repository:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

Il deploy automatico su ogni push si ottiene collegando il repository GitHub al progetto Vercel.

Il routing è **hash-based**: non servono rewrite per le SPA. La build è statica e portabile.

## 1.1 Supabase locale (fase 5)

Il database e l'auth si sviluppano in locale con Supabase CLI e Docker:

```bash
npm run db:start   # avvia Postgres/Auth locali
npm run db:reset   # applica supabase/migrations + supabase/seed.sql
npm run db:test    # pgTAP/RLS
npm run db:types   # rigenera src/data/cloud/database.types.ts
```

La configurazione è in `supabase/config.toml`: signup disabilitato a livello progetto, provider email attivo per il login degli utenti pre-creati, password minima 12, `auto_expose_new_tables = false`, realtime/storage disabilitati. Attenzione: `[auth].enable_signup = false` disabilita solo la registrazione; `[auth.email].enable_signup` deve restare `true`, altrimenti il login email risponde `email_provider_disabled`. Il progetto cloud di produzione sarà creato in T5.4.6.

Per provare login e sync in locale:

1. `npm run db:start`;
2. copia `API_URL` e `PUBLISHABLE_KEY` da `npx supabase status -o env` in `.env.local`;
3. crea l'utente dal dashboard locale o via Admin API;
4. `npm run dev` e apri `/#/login`.

Le variabili sono pubbliche e opzionali: senza di esse la build resta local-only e la UI cloud è nascosta. La service role key non deve mai entrare in Vercel o nel bundle.

Gli E2E auth si eseguono con `npm run test:e2e:auth`; lo script legge le env locali, builda con le credenziali pubbliche e crea/elimina l'utente di test.

Gli E2E sync si eseguono con `npm run test:e2e:sync`. Lo script **azzera il database locale** (`supabase db reset`), builda con le credenziali pubbliche, crea utenti e workspace temporanei via Admin API, esegue i test a due contesti, offline/conflitto e isolamento, e pulisce con `psql`. Richiede `psql` nel PATH e non va eseguito contro un progetto remoto. Il workspace condiviso di test usa gli ID seed; il workspace separato usa dati propri e ID univoci, perché gli ID delle entità sono globali. L'azzeramento evita collisioni tra esecuzioni.

Le migrazioni `20261028130000_service_role_grants.sql` e `20261028140000_admin_last_owner.sql` servono solo agli script amministrativi: il service role non è mai usato dal client e `protect_last_owner` continua a bloccare gli utenti autenticati. La creazione di workspace e membership resta amministrativa: SQL, verifica RLS, reset password e offboarding sono in `docs/engineering/workspace-runbook.md` (T5.4.5).

Operazioni automatiche (T5.4.6):

- `.github/workflows/keepalive.yml` chiama ogni giorno la RPC `keepalive()` con la chiave pubblicabile e apre un issue se fallisce.
- `.github/workflows/backup.yml` esegue un `pg_dump` settimanale data-only via session pooler, cifra gli archivi con `BACKUP_ENCRYPTION_KEY` e li conserva come artifact per 30 giorni. Procedura e restore verificato in `docs/engineering/backup-restore.md`.
- La CI GitHub esegue anche il job `database`: Supabase locale, 33 test pgTAP/RLS, E2E auth e E2E sync. Non usa segreti di produzione.
- Secret GitHub richiesti per le operazioni: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`.

## 2. Header

`vercel.json` imposta:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Robots-Tag: noindex`

Nessun CSP restrittivo in v1.0 per non bloccare gli asset Vite; da valutare in una fase successiva.

## 3. Base path

Vite usa `VITE_BASE` (default `/`).

- Vercel: `/`.
- GitHub Pages con sottocartella: `/nome-repo/`.
- Hash routing: nessun rewrite.

## 4. Preview

Ogni pull request può avere una preview Vercel. Per i task UI, verificare:

- layout desktop 1440 px;
- mobile 375 px;
- percorso da tastiera;
- link condiviso;
- stampa/PDF.

## 5. GitHub Pages (alternativa)

1. Imposta `VITE_BASE=/nome-repo/`.
2. Build con `npm run build`.
3. Pubblica `dist` con `actions/deploy-pages`.
4. Hash routing: nessun 404.

## 6. Netlify / Cloudflare Pages (alternative)

- Build: `npm run build`.
- Output: `dist`.
- Nessun rewrite.
- Netlify e Cloudflare hanno piani gratuiti più permissivi di Vercel Hobby per uso commerciale.

## 7. Nota sui piani gratuiti

Vercel Hobby è pensato per uso personale. Se LayerCost diventa parte di un'attività commerciale, valutare Cloudflare Pages, Netlify o un piano adeguato. Il build non cambia.

## 8. CI

`.github/workflows/ci.yml` esegue typecheck, lint, test, build ed E2E su push e pull request.

## 9. Release checklist

La checklist operativa e l'esito della v1.0.0 sono in `release.md`. In sintesi:

- [x] `npm run check` verde (typecheck, lint, 42 test, build, budget).
- [x] `npm run test:e2e` verde (18 test, Chromium + WebKit).
- [x] `CHANGELOG.md` aggiornato.
- [x] `TASKS.md` aggiornato.
- [x] Backup di prova esportato e reimportato.
- [x] Link condiviso provato in una finestra privata.
- [x] Stampa/PDF provata (Chromium e WebKit).
- [x] Deploy Vercel verificato.
- [x] Tag `v1.0.0` creato e pushato.

## 10. Rollback

- Vercel: “Promote to Production” su un deployment precedente.
- GitHub Pages: rieseguire il workflow su un commit precedente.
- Dati: importare il backup JSON scaricato prima della release.

## 11. Stato attuale

- Repository locale: `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`.
- Nome prodotto: **LayerCost**.
- Repo GitHub: `doublelayerprints/layercost` (privata, branch `main`).
- CI GitHub: verde (`check` + `e2e`) su `main`.
- Deploy Vercel: **live su https://layercost.vercel.app**.
- Release **v1.0.0** del 24/10/2026, commit `cc949b3`, tag `v1.0.0`; deploy di produzione verificato con build `index-C_5bQZYu.js`, gate visivo 0 FAIL, 1 WARN (`ragged-row`, rail sticky), prezzo 3,70 €, bozza protetta, alert di salvataggio non ripetuto al reload, tema scuro persistente e PDF A4 chiaro (99 KB).
- Progetto collegato alla repo; status check Vercel verde sull’ultimo commit.
- Le preview deployment sono protette da SSO Vercel; la produzione è pubblica.
- Header di sicurezza e `robots.txt` verificati.
- Deploy manuale disponibile con `npx vercel login && npx vercel link && npx vercel --prod`.

Le due verifiche manuali — Safari/stampa reale e VoiceOver — sono **rimandate** al 26/10/2026 (non bloccanti); la checklist resta in `manual-checks.md`.

## 12. Baseline visive

Il workflow `.github/workflows/visual-baselines.yml` genera le baseline su Linux:

```bash
gh workflow run visual-baselines.yml --ref main
```

Scaricare l'artifact `visual-baselines`, scompattarlo in `tests/e2e/visual.spec.ts-snapshots/` e committare gli screenshot insieme alla modifica dell'interfaccia. Le baseline non vanno rigenerate per modifiche di solo contenuto o documentazione.
