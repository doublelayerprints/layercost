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
7. Nessuna variabile d'ambiente obbligatoria. Il cloud opzionale usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY`); se mancano, l'app resta local-only. Le pagine “Richiedi accesso” e “Suggerimenti” usano `VITE_ACCESS_REQUEST_ENDPOINT` e `VITE_FEEDBACK_ENDPOINT` (pubbliche, Formspree). Vedi `.env.example`.
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

La configurazione è in `supabase/config.toml`: signup disabilitato a livello progetto, provider email attivo per il login degli utenti pre-creati, password minima 12, `auto_expose_new_tables = false`, realtime/storage disabilitati. Attenzione: `[auth].enable_signup = false` disabilita solo la registrazione; `[auth.email].enable_signup` deve restare `true`, altrimenti il login email risponde `email_provider_disabled`. Il progetto cloud di produzione `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`) è creato e configurato; le migrazioni sono applicate con `supabase db push`.

Per provare login e sync in locale:

1. `npm run db:start`;
2. copia `API_URL` e `PUBLISHABLE_KEY` da `npx supabase status -o env` in `.env.local`;
3. crea l'utente dal dashboard locale o via Admin API;
4. `npm run dev` e apri `/#/login`.

Le variabili sono pubbliche e opzionali: senza di esse la build resta local-only e la UI cloud è nascosta. La service role key non deve mai entrare in Vercel o nel bundle.

Gli E2E auth si eseguono con `npm run test:e2e:auth`; lo script legge le env locali, builda con le credenziali pubbliche e crea/elimina l'utente di test. Il build include anche `VITE_AUTH_GOOGLE_ENABLED=true` per coprire il pulsante Google con il provider mockato.

Il login Google (EVO-1, ADR-0025) è opzionale e spento per default. Per mostrarlo serve `VITE_AUTH_GOOGLE_ENABLED=true` (variabile pubblica, nessun segreto) **dopo** aver configurato il provider Google in Supabase. Il client usa PKCE, torna alla root con `?code=...`, scambia il codice manualmente e mantiene `HashRouter`. Il Client Secret sta solo nel dashboard Supabase (produzione) o in `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` non committato (locale); non va su Vercel. Procedura completa, redirect URI e rollback in `docs/engineering/workspace-runbook.md` §15.

La pagina “Richiedi accesso” (EVO-3a, ADR-0026) usa un form **Formspree Free**. L’endpoint è pubblico e si configura con `VITE_ACCESS_REQUEST_ENDPOINT=https://formspree.io/f/<id>`: **Production** usa il form reale, **Preview/Development** e `.env.local` usano il form di test. Non è un segreto e non va trattato come tale. Se la variabile manca o non è un URL Formspree valido, la route `/#/request-access` mostra “Il modulo non è disponibile in questa build” e disabilita il form. Il form reale va ristretto al dominio `layercost.vercel.app` tramite **Restrict to Domain** nelle impostazioni del **progetto**; il form di test va in un progetto separato senza restrizione, altrimenti `localhost` e le preview finiscono in spam. Il piano Free include 50 invii/mese, archivio 30 giorni e nessun export; non ci sono autoresponse al richiedente. La notifica arriva solo all’amministratore, con `_replyto` impostato all’email del richiedente. Procedura completa, retention e cancellazione in `docs/engineering/access-requests.md`.

La pagina “Suggerimenti” (EVO-6, ADR-0030) usa un secondo form **Formspree Free**, separato da quello delle richieste di accesso. L’endpoint pubblico si configura con `VITE_FEEDBACK_ENDPOINT=https://formspree.io/f/<id>`: **Production** usa il form reale, **Preview/Development** e `.env.local` il form di test. Se la variabile manca o non è un URL Formspree valido, `/#/feedback` mostra “Modulo non disponibile” e disabilita il form. Il form di produzione va ristretto a `layercost.vercel.app`; il piano Free ha 50 invii/mese, archivio 30 giorni e nessuna autoresponse. Il payload contiene solo tipo, area, titolo, descrizione, email opzionale, consenso e `_gotcha`; nessun dato dell’app. Rollback: rimuovere la env o svuotarla. Dettagli in `docs/planning/evo-6-docs-feedback.md` e ADR-0030.

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

EVO-5 (ADR-0029) rimuove `X-Robots-Tag: noindex`: la root è la landing pubblica e deve essere indicizzabile. L’HTML iniziale contiene solo la landing e gli asset, nessun dato privato. Verificato in produzione il 30/10/2026.

Nessun CSP restrittivo in v1.0 per non bloccare gli asset Vite; da valutare in una fase successiva.

## 2.1 Landing pubblica, routing e SEO

- `/#/` landing pubblica; `/#/calculator` app; `/#/welcome` landing forzata.
- `PublicLayout` fuori da `HydrationGate`, `SyncController` e dialoghi cloud; la landing non crea `layercost:data`.
- Il plugin Vite `landingPrerender` legge `src/features/landing/landing-static.html` e lo inietta in `#root` solo in build. Aggiornare il partial dopo una modifica ai testi:
  ```bash
  npx vitest run src/features/landing/static-render.test.ts -u
  ```
- `index.html`: title/description italiani, canonical `https://layercost.vercel.app/`, Open Graph/Twitter, `og-image.jpg` 1200×630, JSON-LD `SoftwareApplication`, `robots: index,follow`.
- `public/robots.txt`: `Allow: /` e `Sitemap: https://layercost.vercel.app/sitemap.xml`; `public/sitemap.xml` contiene la root.
- Screenshot reali in `public/landing/`; rigenerazione con `npm run capture:landing`.
- Budget: JS iniziale 218,2/230 KB, HTML 6,0/10 KB, totale 284,5/350 KB. Motivazione in ADR-0029.
- L’inglese è disponibile nell’interfaccia; un’indicizzazione inglese separata (`/en` o `?lang=en`) non è implementata.

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
- CI GitHub: verde su `main` `ec321fb` (`check`, `e2e`, `database`).
- Deploy Vercel: **live su https://layercost.vercel.app**, build `index-CciHjhFo.js` / `index-DicimwUj.css` con landing EVO-5, copy gratuita e switch in top bar, cloud, Google, EVO-3a e limite `.3mf` attivi (PR #30, #32 e #34).
- Supabase produzione: `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account owner, signup disabilitato, keep-alive e backup verificati.
- Google login (EVO-1, ADR-0025): distribuito il 29/10/2026 con `VITE_AUTH_GOOGLE_ENABLED=true` su Production e Preview. OAuth client e provider Supabase configurati; login verificato per **entrambi gli account** (2 identità Google su 2); il secondo owner ha completato il collegamento il 29/10/2026. Il rollback è documentato nel runbook §15.
- Richiesta accesso (EVO-3a, ADR-0026): implementata, configurata e distribuita il 29/10/2026 (PR #26, squash `125f0d5`, build `index-B6Cg37Ap.js` / `index-G-eqO2lr.css`). Formspree ha form di produzione e test separati, endpoint in locale/Vercel, notifica email verificata e Restrict to Domain sul progetto di produzione; submission reale e smoke verdi. Resta la pulizia delle submission di prova. Runbook in `docs/engineering/access-requests.md`.
- Limite import `.3mf`: distribuito il 29/10/2026 (PR #28, squash `338d693`, build `index-BR5hKjFi.js` / `index-G-eqO2lr.css`). File compresso fino a **250 MiB**, contenuto decompresso fino a **1 GiB**; smoke di produzione verde.
- Landing pubblica (EVO-5, ADR-0029): distribuita il 30/10/2026 con la PR #30, la copy gratuita della PR #32 e gli switch in top bar della PR #34 (squash `8d7d2e2`, build `index-CciHjhFo.js` / `index-DicimwUj.css`). Verificati in produzione HTML pre-renderizzato, canonical/OG, `robots.txt` con `Allow: /`, `sitemap.xml`, assenza di `X-Robots-Tag`, `/calculator`, `/welcome`, immagini `public/landing/` e `og-image.jpg`; smoke verde. In locale: 249 unitari, 68 E2E, 42 screenshot, 12 test visuali Linux, `inspect.mjs` 0 FAIL/1 WARN, budget 218,2/230 KB e HTML 6,0/10 KB.
- Documentazione e Suggerimenti (EVO-6, ADR-0030): distribuiti il 30/10/2026 con la PR #36 (squash `ec321fb`, build `index-BE8ZeH6G.js` / `index-VqC-Ge2M.css`). Route `/#/docs/:section` e `/#/feedback`, gruppo sidebar **Aiuto**, guida a dieci sezioni con screenshot, secondo form Formspree con `VITE_FEEDBACK_ENDPOINT` (Production = form reale, Preview/Development = test), Restrict to Domain attivo sul form di produzione e submission di test verificata. Verifiche in produzione: docs, immagini, form abilitato e nessun errore di pagina. Verifiche in locale: 267 unitari, 5 E2E docs, 6 E2E feedback con endpoint mockato, 1 senza endpoint, axe, budget 220,2/230 KB iniziale e 73,0/80 KB lazy. Restano submission di produzione, pulizia di quella di test e baseline visual dedicata (follow-up).
- Release **v1.0.0** del 24/10/2026, commit `cc949b3`, tag `v1.0.0`; deploy di produzione verificato con build `index-C_5bQZYu.js`, gate visivo 0 FAIL, 1 WARN (`ragged-row`, rail sticky), prezzo 3,70 €, bozza protetta, alert di salvataggio non ripetuto al reload, tema scuro persistente e PDF A4 chiaro (99 KB).
- Progetto collegato alla repo; status check Vercel verde sull’ultimo commit.
- Le preview deployment sono protette da SSO Vercel; la produzione è pubblica.
- Header di sicurezza e `robots.txt` verificati; con EVO-5 `robots.txt` passa a `Allow: /` con sitemap e l’header `X-Robots-Tag: noindex` viene rimosso. Verifica di produzione completata il 30/10/2026.
- Deploy manuale disponibile con `npx vercel login && npx vercel link && npx vercel --prod`.

Le due verifiche manuali — Safari/stampa reale e VoiceOver — sono **rimandate** al 26/10/2026 (non bloccanti); la checklist resta in `manual-checks.md`.

## 12. Baseline visive

Il workflow `.github/workflows/visual-baselines.yml` genera le baseline su Linux:

```bash
gh workflow run visual-baselines.yml --ref main
```

Scaricare l'artifact `visual-baselines`, scompattarlo in `tests/e2e/visual.spec.ts-snapshots/` e committare gli screenshot insieme alla modifica dell'interfaccia. Le baseline non vanno rigenerate per modifiche di solo contenuto o documentazione.

## 13. Smoke test cloud

Dopo il deploy con Supabase attivo:

```bash
export SUPABASE_URL='https://<project-ref>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<service-role>'
export PROD_URL='https://layercost.vercel.app'
npm run smoke:production
```

Lo script crea un utente e un workspace temporanei, accede alla produzione, verifica lo stato “Sincronizzato”, crea un preventivo, controlla che sia nell'archivio e pulisce workspace e utente. La service role key resta nella shell locale: non va in Vercel, nel repository o nel bundle. Lo smoke usa email/password e **non** copre Google: il login Google reale va verificato manualmente con un account di test dopo aver impostato `VITE_AUTH_GOOGLE_ENABLED=true` (runbook §15).

Il comando è stato verificato il 28/10/2026 sia contro una preview locale con backend di produzione sia contro https://layercost.vercel.app; entrambe le esecuzioni hanno creato e rimosso correttamente utente e workspace temporanei. Se il cleanup fallisce, eliminare workspace e utente con la procedura del `docs/engineering/workspace-runbook.md`.
