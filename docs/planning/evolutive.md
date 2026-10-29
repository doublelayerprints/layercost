# Evolutive — Google login, tetti utenti/preventivi e apertura

**Stato:** proposta, non implementata
**Data:** 29 ottobre 2026
**Contesto:** T5.4 chiuso; cloud live in produzione
**Piano collegato:** `docs/planning/t5.4-cloud-sync.md`
**ADR da creare:** 0025 (Google OAuth), 0026 (tetti e signup), 0027 (multi-workspace, solo se serve)

Questo documento raccoglie le evolutive discusse dopo il deploy T5.4. Serve a riprendere il lavoro in una nuova sessione senza ricostruire il contesto.

---

## 0. Stato di partenza

### Produzione

- **App:** https://layercost.vercel.app
- **Supabase:** progetto `layercost-prod`, ref `jcxkfhjgstdgrjazlnpq`, regione `eu-central-1` (Frankfurt), piano **Free**.
- **Workspace:** `ws-doublelayer`, nome “DoubleLayeR Prints”.
- **Membri:** due account `owner`; le email non sono nel repository.
- **Dati attuali:** 2 stampanti, 8 materiali, 5 extra, 2 preventivi (29/10/2026).
- **Auth:** email + password, signup pubblico disabilitato, nessun SMTP; reset amministrativo.
- **Deploy:** build `index-D9pxS7o0.js` / `index-BPCFEMKa.css`; cloud attivo.
- **Operazioni:** keep-alive giornaliero e backup settimanale cifrato attivi e verificati.
- **Segreti:** `.env.local` contiene credenziali di produzione ed è gitignored; su Vercel ci sono solo `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Codice rilevante

| Area | File |
| --- | --- |
| Client Supabase lazy | `src/data/cloud/client.ts` |
| Auth gateway | `src/data/cloud/auth.ts` |
| Auth store | `src/state/auth-store.ts` |
| Login UI | `src/features/auth/LoginPage.tsx` |
| Sync settings | `src/features/settings/SyncSettings.tsx` |
| i18n auth | `src/i18n/it/auth.ts`, `src/i18n/en/auth.ts` |
| Test auth | `tests/e2e/auth.spec.ts` |
| Schema cloud | `supabase/migrations/20261028120000_init.sql` |
| Runbook | `docs/engineering/workspace-runbook.md` |
| Backup | `docs/engineering/backup-restore.md` |

### Vincoli attuali

- L'app usa `HashRouter`; il client Supabase ha `detectSessionInUrl: false`.
- Un solo workspace condiviso; gli ID delle entità sono primary key `text` globali.
- `Quote` schema locale **v4**, `engineVersion` **1.0.0**.
- Non si toccano formule, snapshot o semantica dei preventivi.
- Il piano resta **€0** finché i limiti Free sono sufficienti; nessuna carta collegata.

---

## 1. Obiettivi

1. **Google login** per i due account esistenti, senza obbligare a una password LayerCost.
2. **Apertura controllata** a più utenti, con un tetto massimo di utenti e di preventivi in cloud.
3. Mantenere **email/password** come fallback amministrativo.
4. Mantenere local-first, RLS, backup, keep-alive e costo €0.
5. Se in futuro serve un archivio separato per ogni cliente, avere un piano multi-workspace esplicito.

### Non-obiettivi immediati

- Portale clienti o login per i clienti finali.
- Realtime, notifiche, presenza.
- SSO SAML, MFA avanzata, ruoli oltre `owner`/`editor`.
- Fatturazione o piano Pro, salvo decisione successiva.
- Modifiche a formule, `engineVersion`, snapshot o schema locale.

---

## 2. Decisioni proposte e questioni aperte

| Tema | Proposta | Stato |
| --- | --- | --- |
| Google login | Provider aggiuntivo, non sostitutivo | Da confermare |
| Account esistenti | Prima test auto-link; fallback “Collega Google” con `linkIdentity` | Da testare |
| Signup | Resta disabilitato nella prima fase; utenti pre-creati | Proposto |
| Nuovi utenti | Invite-only; niente self-service | Proposto |
| Tetto utenti | Allowlist + eventuale tetto numerico con Auth Hook | Da decidere |
| Tetto membri | Trigger su `workspace_members` con `workspace_limits.max_members` | Proposto |
| Tetto preventivi | Trigger su `quotes` con `workspace_limits.max_quotes` | Proposto |
| Multi-workspace | Rinviato; prima decidere stesso archivio o archivio per cliente | Aperto |
| Custom domain | Non necessario; branding Google opzionale | Rinviato |
| Piano | Free finché i limiti bastano; Pro solo se serve | Proposto |

### Domande da chiudere prima di implementare

1. Le due email Google sono le stesse dei due account attuali?
2. Vogliamo provare l'auto-link o aggiungere subito “Collega Google”?
3. Il tetto utenti è **globale** (tutti gli account) o **per workspace**?
4. Il tetto preventivi è per workspace o globale?
5. Quanti utenti e quanti preventivi come prima soglia? Proposta: 10 utenti, 500 preventivi.
6. L'apertura futura è “più membri nello stesso archivio” o “un archivio per cliente”?
7. Vogliamo mantenere email/password per sempre o solo come admin fallback?
8. Serve un dominio personalizzato per il consent screen Google? (Pro, $10/mese, non necessario ora).

---

## 3. EVO-1 — Google login

**Obiettivo:** i due account esistenti possono accedere con Google; email/password resta disponibile.
**Stima:** 0,5–1 giorno.
**Dipende da:** accesso a Google Cloud e Supabase Dashboard.

### 3.1 Google Cloud

1. Aprire [Google Cloud Console](https://console.cloud.google.com/) e creare o selezionare un progetto.
2. Configurare **Google Auth Platform → Audience**:
   - tipo **External**;
   - in fase di test aggiungere i due account come **test users**;
   - pubblicare quando si apre a più utenti.
3. Configurare **Data Access (Scopes)**:
   - `openid` (da aggiungere manualmente);
   - `.../auth/userinfo.email`;
   - `.../auth/userinfo.profile`.
4. Creare **OAuth Client ID → Web application**.
5. **Authorized JavaScript origins:**
   - `https://layercost.vercel.app`
   - `http://localhost:5173`
6. **Authorized redirect URIs:**
   - `https://jcxkfhjgstdgrjazlnpq.supabase.co/auth/v1/callback`
   - `http://127.0.0.1:54321/auth/v1/callback`
7. Salvare **Client ID** e **Client Secret**. Il secret non va nel repository, nel bundle o su Vercel: va solo nel dashboard Supabase.

> Il consent screen mostrerà il dominio Supabase finché non si configura un custom domain. Per due utenti va bene; per un'apertura pubblica valutare branding/custom domain.

### 3.2 Supabase Dashboard

1. Aprire **Authentication → Providers → Google**:
   `https://supabase.com/dashboard/project/jcxkfhjgstdgrjazlnpq/auth/providers`
2. Abilitare Google e incollare Client ID e Client Secret.
3. In **Authentication → URL Configuration** verificare:
   - Site URL: `https://layercost.vercel.app`;
   - redirect: `https://layercost.vercel.app/**`, `http://localhost:5173/**`.
4. Lasciare **Allow new users to sign up** disattivato nella prima fase.
5. Verificare che il provider email resti abilitato: serve per il fallback e per gli account esistenti.
6. In locale, aggiungere in `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "<client-id>"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
   skip_nonce_check = false
   ```
   e mettere il secret in un file locale non committato.

### 3.3 Modifiche all'app

1. **Auth gateway** (`src/data/cloud/auth.ts`):
   - aggiungere `signInWithOAuth(provider: 'google', redirectTo: string)`;
   - aggiungere `linkIdentity(provider: 'google')`;
   - mappare gli errori: `provider_disabled`, `redirect_uri_mismatch`, `access_denied`, `signup_disabled`, `identity_already_exists`, rete.
2. **Client Supabase** (`src/data/cloud/client.ts`):
   - oggi `detectSessionInUrl: false`.
   - Scegliere una delle due strategie:
     - **A (consigliata):** `redirectTo: window.location.origin` (senza hash), scambio manuale del `code` all'avvio con `exchangeCodeForSession`, pulizia dell'URL e navigazione a `/#/`.
     - **B:** route `/auth/callback` dedicata, con rewrite Vercel verso `index.html`, e scambio del `code` nella route.
   - La strategia A evita di modificare il routing hash e non richiede rewrite.
3. **Login page** (`src/features/auth/LoginPage.tsx`):
   - pulsante **“Continua con Google”** sopra/sotto il form email/password;
   - stato di caricamento, errore accessibile, focus;
   - i18n IT/EN;
   - nessun link di registrazione.
4. **Account esistenti:**
   - testare l'auto-link: Supabase collega automaticamente un'identità Google a un utente con la stessa email **verificata**;
   - se l'auto-link non funziona o dà conflitti, aggiungere in Impostazioni → Sincronizzazione un pulsante **“Collega Google”** che usa `linkIdentity` mentre l'utente è già autenticato con email/password;
   - per `linkIdentity` va abilitato **Allow manual linking** in Supabase Auth.
5. **Dopo il login OAuth:**
   - l'auth store deve passare a `authenticated`;
   - SyncController collega il workspace;
   - logout e sessione scaduta restano invariati;
   - nessuna modifica a RLS, sync, snapshot o schema.

### 3.4 Test

- Unit: mapping errori OAuth, `signInWithOAuth` chiama il provider giusto, `linkIdentity`.
- E2E: il pulsante Google porta all'URL OAuth corretto (mockando il gateway, senza dipendere da Google).
- Manuale: login reale con un account Google di test su locale/staging.
- Manuale: login con Google per un account esistente; verifica sync, quote, logout, reload.
- Axe su login con il nuovo pulsante a 375/1440.
- Smoke di produzione con un account Google di test solo dopo il deploy; non usare gli account reali per i test distruttivi.

### 3.5 Acceptance

- [ ] I due account esistenti possono accedere con Google.
- [ ] Email/password continua a funzionare come fallback.
- [ ] Un'email Google non presente e signup disabilitato viene rifiutata con messaggio chiaro.
- [ ] Sessione persistente, reload, logout, sync e RLS invariati.
- [ ] Nessun Client Secret nel bundle, nel repository o su Vercel.
- [ ] Errori OAuth mappati e accessibili.
- [ ] `npm run check`, `db:test`, `test:e2e`, `test:e2e:auth`, `test:e2e:sync` verdi.
- [ ] Documentazione privacy/auth aggiornata.

### 3.6 Rischi e rollback

| Rischio | Mitigazione |
| --- | --- |
| Auto-link non funziona | Usare `linkIdentity` dopo login email/password |
| Redirect URI errato | Controllare callback Supabase e URL Google |
| HashRouter interferisce | Strategia A: redirect alla root e scambio manuale |
| Consent screen poco familiare | Branding Google; custom domain solo se serve |
| Google Account perso | Mantenere email/password e reset admin |
| Provider Google down | Fallback email/password |
| Signup disabilitato blocca nuovi utenti | Invite-only: pre-creare gli utenti |

**Rollback:** disabilitare Google nel dashboard Supabase; il login email/password resta operativo. Lato app, nascondere il pulsante con una env o un flag.

---

## 4. EVO-2 — Tetti utenti e preventivi

**Obiettivo:** aprire a più utenti con limiti configurabili, senza dipendere solo dai limiti del piano.
**Stima:** 1–2 giorni.
**Dipende da:** decisione sul modello (stesso workspace o workspace separati).

### 4.1 Perché non basta Supabase

Supabase Free offre:
- utenti totali illimitati;
- 50.000 MAU;
- 500 MB DB per progetto;
- 5 GB egress;
- 2 progetti attivi;
- nessun backup automatico.

**Non esiste** un campo “massimo 20 utenti” o “massimo 100 preventivi”. Un tetto commerciale va implementato nel database e nella UI.

### 4.2 Modello dati proposto

```sql
create table public.workspace_limits (
  workspace_id text primary key references public.workspaces (id) on delete cascade,
  max_members integer not null default 10 check (max_members > 0),
  max_quotes integer not null default 500 check (max_quotes > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
```

- RLS: `select` per i membri del workspace; `update` solo owner/admin (o service role nella prima iterazione).
- Backfill: una riga per ogni workspace esistente.
- I valori sono una **regola di prodotto**, non un limite fisico del piano.
- In futuro si possono aggiungere `max_storage_mb`, `plan`, `notes`.

### 4.3 Tetto utenti

Tre livelli possibili, da scegliere in base all'apertura:

1. **Invite-only (consigliato per la prima fase):**
   - signup disabilitato;
   - l'amministratore crea l'utente dal dashboard o via Admin API;
   - nessun tetto numerico necessario, perché nessuno può registrarsi da solo;
   - Google login dovrebbe funzionare per gli utenti pre-creati con la stessa email; va verificato con auto-link o con `linkIdentity`.

2. **Allowlist:**
   - tabella `public.signup_allowlist(email text primary key, note text, created_at timestamptz)`;
   - Auth Hook **Before User Created** che accetta solo email presenti;
   - adatto a beta chiuse con inviti manuali.

3. **Tetto numerico globale:**
   - Auth Hook **Before User Created**;
   - conta gli utenti esistenti (`auth.users`) e rifiuta oltre `max_users`;
   - usare un advisory lock o una tabella contatore per evitare due signup simultanei oltre il tetto;
   - errore HTTP 403/429 con messaggio “Posti esauriti”.

Auth Hook `before-user-created` è disponibile sul piano **Free** (verificato il 29/10/2026). Si configura in **Authentication → Hooks** e può essere una funzione Postgres o un HTTP endpoint.

### 4.4 Tetto membri per workspace

Trigger su `workspace_members`:

- su `insert`, contare i membri del workspace;
- leggere `workspace_limits.max_members`;
- usare `pg_advisory_xact_lock(hashtext('members:' || new.workspace_id))` per serializzare;
- se il conteggio è al limite, `raise exception 'member_limit_reached' using errcode = 'P0001'`;
- su `update` del ruolo non serve un nuovo conteggio, salvo cambio workspace (non previsto).

L'app deve mostrare un errore chiaro e non perdere dati. Il service role/admin può bypassare il trigger solo per operazioni amministrative, non il client.

### 4.5 Tetto preventivi per workspace

Trigger su `quotes`:

- su `insert`: contare i preventivi con `deleted_at is null` nel workspace;
- su `update`: se si ripristina un tombstone (`old.deleted_at is not null and new.deleted_at is null`) verificare di nuovo il tetto;
- leggere `workspace_limits.max_quotes`;
- advisory lock per workspace;
- `raise exception 'quote_limit_reached' using errcode = 'P0001'`;
- i preventivi archiviati ma non cancellati contano; i soft-deleted no;
- la cancellazione/archiviazione non cancella dati e libera il posto solo se `deleted_at` viene valorizzato.

L'app deve mostrare “Hai raggiunto il limite di N preventivi. Esporta o elimina i vecchi preventivi (l'archiviazione non libera il posto).” e impedire il salvataggio prima della chiamata, ma il trigger resta la fonte di verità.

### 4.6 UI e amministrazione

- In **Impostazioni → Sincronizzazione** o in una nuova sezione **Workspace**:
  - “Membri: 2/10”;
  - “Preventivi: 87/500”;
  - spiegazione del limite e cosa fare.
- Errori di limite mappati per codice (`member_limit_reached`, `quote_limit_reached`, `signup_limit_reached`).
- Prima iterazione: modifica dei limiti via SQL/runbook, non UI.
- Dopo: piccola UI admin per owner, con audit `updated_by`.

### 4.7 Test e acceptance

- pgTAP:
  - inserimento sotto il limite;
  - inserimento al limite rifiutato;
  - cancellazione soft che libera un posto;
  - ripristino del tombstone che rispetta il tetto;
  - RLS: un membro non può modificare `workspace_limits`;
  - workspace diverso non influenzato.
- Unit: parsing/lettura limiti, mapping errori.
- E2E: limite basso, tentativo di aggiungere membro/preventivo, messaggio e nessuna perdita.
- Concorrenza: due insert simultanei non devono superare il tetto (test SQL con transazioni o revisione del lock).
- `npm run check`, `db:test`, `test:e2e`, auth/sync E2E verdi.
- Nessuna modifica a formule, `engineVersion`, snapshot o schema locale.

### 4.8 Rischi

| Rischio | Mitigazione |
| --- | --- |
| Race condition sul conteggio | Advisory lock per workspace |
| Tombstone/ripristino non contato | Trigger anche su update |
| Client aggiornato ma DB no | Migrazione + test pgTAP |
| UI mostra conteggi vecchi | Refresh dopo ogni scrittura; il trigger decide |
| Limite troppo basso blocca lavoro | Valori configurabili; avviso prima del limite |
| Service role bypassa | Solo admin; non nel client |

---

## 5. EVO-3/EVO-4 — Apertura e multi-workspace

**Stato:** decisione non presa. Da affrontare solo quando l'apertura non è più “due persone”.

EVO-3 (invite-only/allowlist) è descritto in §4.3; questa sezione riguarda soprattutto EVO-4, il modello multi-workspace.

### 5.1 Due modelli

**A — Stesso archivio con più membri**
- Tutti vedono gli stessi preventivi e la stessa configurazione.
- Basta aggiungere membership e un tetto `max_members`.
- Nessuna migrazione di schema.
- Adatto a un team/famiglia.

**B — Un workspace per cliente/team**
- Ogni cliente vede solo i propri dati.
- Richiede onboarding, inviti, workspace switcher e RLS per workspace (le policy esistono già).
- È una evoluzione multi-tenant vera.

### 5.2 Impatto tecnico del modello B

Oggi:
- `workspaces` e `workspace_members` esistono;
- ogni tabella dati ha `workspace_id`;
- ma le primary key sono `id text` globali;
- i seed hanno ID fissi (`printer-kobra-3`, ecc.);
- `layercost:sync-state` usa chiavi `entity:id`;
- la cache cloud è una sola;
- i link condivisi contengono il preventivo, non il workspace.

Per il modello B serve:
1. PK `(workspace_id, id)` o ID globalmente unici per tutte le entità.
2. Aggiornamento di foreign key, tipi generati, mapper e test.
3. Chiavi di sync e cache che includano il workspace.
4. Onboarding: creazione workspace + membership owner + seed iniziale.
5. UI per creare/selezionare un workspace e invitare membri.
6. Admin per limiti e membership.
7. Test di isolamento con due workspace e gli stessi ID seed.
8. Migrazione dei dati esistenti e backup prima della migrazione.
9. ADR dedicato (0027) e piano di rollback.

### 5.3 Raccomandazione

- Prima **A**: più membri nello stesso archivio, con `max_members`.
- Solo se nasce l'esigenza di clienti separati, fare **B** con ADR e migrazione dedicata.
- Non introdurre multi-workspace “di nascosto”: il limite degli ID globali è già documentato.

---

## 6. Roadmap consigliata

| Fase | Contenuto | Stima | Dipendenze |
| --- | --- | --- | --- |
| **EVO-1** | Google login per i due account; fallback email/password | 0,5–1 giorno | Google Cloud + Supabase |
| **EVO-2** | `workspace_limits`, trigger membri/preventivi, UI quota | 1–2 giorni | EVO-1 o indipendente |
| **EVO-3** | Invite-only/allowlist, eventuale tetto globale | 1–2 giorni | EVO-2 |
| **EVO-4** | Multi-workspace (solo se serve) | 3–5 giorni | ADR-0027, migrazione |

Ordine consigliato: **EVO-1 → EVO-2 → EVO-3**. EVO-4 solo dopo una decisione esplicita.

---

## 7. Domande aperte per la prossima sessione

1. Le email Google dei due account sono le stesse già usate per gli account attuali o altre?
2. Proviamo prima l'auto-link o implementiamo subito “Collega Google”?
3. Il login Google deve essere l'unico metodo per i nuovi utenti o restare affiancato a email/password?
4. Il tetto utenti è globale o per workspace?
5. Valori iniziali: 10 utenti e 500 preventivi? Altri?
6. Il tetto preventivi conta anche gli archiviati? (Proposta: sì, purché non cancellati.)
7. L'apertura futura è stesso archivio o un workspace per cliente?
8. Serve un custom domain/branding Google o va bene il dominio Supabase?
9. Chi gestisce gli inviti e i limiti: solo admin via SQL o UI owner?
10. Restiamo su Free finché possibile o prevediamo un passaggio a Pro a una soglia?

---

## 8. Prompt di handoff per la prossima sessione

Copiare e incollare:

> Leggi `AGENTS.md`, `STATUS.md` §8, `TASKS.md` (sezione Evolutive), `docs/planning/evolutive.md`, `docs/planning/t5.4-cloud-sync.md` §0, `docs/engineering/workspace-runbook.md`, `docs/engineering/backup-restore.md`, `docs/engineering/deployment.md` §1.1 e §13, ADR-0024 e i file `src/data/cloud/{client,auth}.ts`, `src/state/auth-store.ts`, `src/features/auth/LoginPage.tsx`, `src/features/settings/SyncSettings.tsx`, `tests/e2e/auth.spec.ts`. Il cloud è live su https://layercost.vercel.app con Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), workspace `ws-doublelayer`, due account owner e signup disabilitato. Parti da **EVO-1 — Google login** per i due account esistenti, poi EVO-2 (tetti utenti/preventivi). Crea **ADR-0025** per Google OAuth e **ADR-0026** per i tetti prima di implementare. Servono il Client ID e il Client Secret di un OAuth client Google Web; il secret va solo nel dashboard Supabase, mai nel repository, nel bundle o su Vercel. Testa prima in locale/staging, poi produzione. Mantieni email/password come fallback. Non cambiare formule, `engineVersion`, snapshot o schema locale; non committare `.env.local`; non eseguire `test:e2e:sync` contro la produzione. Usa un branch e una PR, non push diretto su `main`. Gate: `npm run check`, `npm run db:test`, `npm run test:e2e`, `npm run test:e2e:auth`, `npm run test:e2e:sync`, `npm run smoke:production`. Aggiorna STATUS, TASKS, docs, CHANGELOG e la documentazione privacy/auth.

---

## 9. Checklist di avvio EVO-1

- [ ] Leggere questo documento e i file collegati.
- [ ] Scrivere ADR-0025 (Google OAuth) e, se si implementano subito, ADR-0026 (tetti).
- [ ] Creare OAuth client Google Web.
- [ ] Configurare Google provider in Supabase.
- [ ] Aggiungere redirect URL produzione/localhost.
- [ ] Implementare `signInWithOAuth` e il callback.
- [ ] Aggiungere il pulsante “Continua con Google” e i18n.
- [ ] Testare auto-link sui due account; se fallisce, implementare “Collega Google”.
- [ ] Verificare che email/password resti funzionante.
- [ ] Axe, E2E, build, budget.
- [ ] Deploy preview, smoke, produzione.
- [ ] Aggiornare documentazione e stato.

---

## 10. Riferimenti

- Supabase, **Sign in with Google** (consultato il 29/10/2026): https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase, **Identity linking** (consultato il 29/10/2026): https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase, **Before User Created Hook** (consultato il 29/10/2026): https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- Supabase, **Auth Hooks** e piani (consultato il 29/10/2026): https://supabase.com/docs/guides/auth/auth-hooks
- Supabase, **Pricing** (consultato il 29/10/2026): https://supabase.com/pricing
- Supabase, **Project Pausing** (consultato il 29/10/2026): https://supabase.com/docs/guides/platform/free-project-pausing
- `docs/planning/t5.4-cloud-sync.md` — schema, RLS, sync, operazioni.
- `docs/engineering/workspace-runbook.md` — utenti, membership, reset, offboarding.
- `docs/engineering/backup-restore.md` — backup e restore.
- `docs/adr/0024-supabase-auth-workspace.md` — decisione auth/tenancy attuale.
