# Evolutive — Google login, richiesta accesso, tetti utenti/preventivi e apertura

**Stato:** EVO-1 implementato e distribuito il 29/10/2026 (ADR-0025, PR #24); EVO-3a implementato il 29/10/2026 (ADR-0026, pagina “Richiedi accesso”); EVO-2–EVO-4 proposte
**Data:** 29 ottobre 2026
**Contesto:** T5.4 chiuso; cloud live in produzione
**Piano collegato:** `docs/planning/t5.4-cloud-sync.md`
**ADR:** 0025 (Google OAuth), **0026 (pagina Richiedi accesso)**; **0027** (tetti e signup) e **0028** (multi-workspace) solo se si implementano EVO-2/EVO-4

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
- **Deploy:** prima di EVO-1, build `index-D9pxS7o0.js` / `index-BPCFEMKa.css`; dal 29/10/2026 build `index-BN8y8TA2.js` / `index-B2c8cUBY.css` con cloud e Google attivi. EVO-3a è pronta nel branch `feat/evo-3a-request-access` (PR #26, CI verde) e richiede `VITE_ACCESS_REQUEST_ENDPOINT` per essere attivata in produzione.
- **Operazioni:** keep-alive giornaliero e backup settimanale cifrato attivi e verificati.
- **Segreti:** `.env.local` contiene credenziali di produzione ed è gitignored; su Vercel ci sono solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e i flag pubblici (`VITE_AUTH_GOOGLE_ENABLED`). Per EVO-3a va aggiunto `VITE_ACCESS_REQUEST_ENDPOINT` (endpoint Formspree pubblico).

### Codice rilevante

| Area                 | File                                                 |
| -------------------- | ---------------------------------------------------- |
| Client Supabase lazy | `src/data/cloud/client.ts`                           |
| Auth gateway         | `src/data/cloud/auth.ts`                             |
| Auth store           | `src/state/auth-store.ts`                            |
| Login UI             | `src/features/auth/LoginPage.tsx`                    |
| Sync settings        | `src/features/settings/SyncSettings.tsx`             |
| i18n auth            | `src/i18n/it/auth.ts`, `src/i18n/en/auth.ts`         |
| Test auth            | `tests/e2e/auth.spec.ts`                             |
| Schema cloud         | `supabase/migrations/20261028120000_init.sql`        |
| Runbook              | `docs/engineering/workspace-runbook.md`              |
| Backup               | `docs/engineering/backup-restore.md`                 |
| Richiesta accesso    | `src/features/access/`, `src/i18n/{it,en}/access.ts` |
| Runbook richieste    | `docs/engineering/access-requests.md`                |

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

| Tema              | Proposta                                                                  | Stato                                       |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| Google login      | Provider aggiuntivo, non sostitutivo                                      | **Implementato (ADR-0025)**                 |
| Account esistenti | Auto-link; fallback “Collega Google” con `linkIdentity`                   | **Implementato; 2 account su 2 con Google** |
| Signup            | Resta disabilitato nella prima fase; utenti pre-creati                    | Confermato                                  |
| Nuovi utenti      | Invite-only; niente self-service; pagina “Richiedi accesso” con Formspree | **Pagina implementata (ADR-0026)**          |
| Richiesta accesso | Formspree Free, endpoint pubblico, nessuna approvazione automatica        | **Implementata (EVO-3a/ADR-0026)**          |
| Tetto utenti      | Allowlist + eventuale tetto numerico con Auth Hook                        | Da decidere (EVO-2/EVO-3b)                  |
| Tetto membri      | Trigger su `workspace_members` con `workspace_limits.max_members`         | Proposto per EVO-2                          |
| Tetto preventivi  | Trigger su `quotes` con `workspace_limits.max_quotes`                     | Proposto per EVO-2                          |
| Multi-workspace   | Rinviato; prima decidere stesso archivio o archivio per cliente           | Aperto                                      |
| Custom domain     | Non necessario; branding Google opzionale                                 | Rinviato                                    |
| Piano             | Free finché i limiti bastano; Pro solo se serve                           | Proposto                                    |

### Domande da chiudere prima di implementare

1. Le due email Google sono le stesse dei due account attuali? **Sì, verificate**: entrambi gli account hanno un’identità Google (2 su 2) dal 29/10/2026.
2. ~~Vogliamo provare l'auto-link o aggiungere subito “Collega Google”?~~ **Entrambi**: auto-link come percorso principale, “Collega Google” come fallback deterministico.
3. Il tetto utenti è **globale** (tutti gli account) o **per workspace**? Aperto (EVO-2/EVO-3b).
4. Il tetto preventivi è per workspace o globale? Aperto (EVO-2).
5. Quanti utenti e quanti preventivi come prima soglia? Proposta: 10 utenti, 500 preventivi.
6. L'apertura futura è “più membri nello stesso archivio” o “un archivio per cliente”?
7. Vogliamo mantenere email/password per sempre o solo come admin fallback? **Sì, per sempre**: è il fallback di ADR-0025.
8. Serve un dominio personalizzato per il consent screen Google? (Pro, $10/mese, non necessario ora).

---

## 3. EVO-1 — Google login

**Obiettivo:** i due account esistenti possono accedere con Google; email/password resta disponibile.
**Stato:** **implementato, distribuito e verificato** il 29/10/2026 (PR #24) per entrambi gli account; 2 identità Google su 2.
**Stima:** 0,5–1 giorno.
**Dipende da:** accesso a Google Cloud e Supabase Dashboard.
**ADR:** `docs/adr/0025-google-oauth.md`.

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

### 3.3 Modifiche all'app (implementate)

1. **Auth gateway** (`src/data/cloud/auth.ts`): `signInWithOAuth`, `linkIdentity` ed `exchangeCodeForSession`; `AuthUser.providers` espone le identità collegate; `mapAuthError` riconosce `provider_disabled`, `redirect_uri_mismatch`, `access_denied`, `signup_disabled`, `identity_already_exists`, `manual_linking_disabled`, gli errori di stato/codice PKCE e la rete.
2. **Client Supabase** (`src/data/cloud/client.ts`): `flowType: 'pkce'`, `detectSessionInUrl: false`, `redirectTo = origin + '/'`. Il codice arriva nel **query string**, viene scambiato all'avvio con `exchangeCodeForSession`, i parametri OAuth vengono rimossi e il fragment resta libero per `HashRouter`. Nessuna route di callback e nessun rewrite.
3. **Modulo puro** (`src/data/cloud/oauth.ts`): parsing del callback, mapping degli errori del provider, costruzione del redirect e pulizia dell'URL; testato senza browser.
4. **Login page** (`src/features/auth/LoginPage.tsx`): pulsante **“Continua con Google”** sopra il form, divisore “oppure”, stato di reindirizzamento, errore accessibile con `role="alert"`, i18n IT/EN, nessun link di registrazione.
5. **Account esistenti:** auto-link di Supabase per email verificata; in **Impostazioni → Sincronizzazione** il pulsante **“Collega Google”** (`linkIdentity`) è il fallback deterministico. Con l'identità già collegata compare “Google collegato”. “Allow manual linking” è attivo nella config locale e va abilitato nel dashboard di produzione.
6. **Callback fallito:** `OAuthCallbackRedirect` porta l'utente su `/#/login` con il messaggio mappato, invece di lasciarlo sul calcolatore.
7. **Dopo il login OAuth:** l'auth store passa a `authenticated`, `SyncController` collega il workspace, logout e sessione scaduta restano invariati. Nessuna modifica a RLS, sync, snapshot o schema.
8. **Flag di rollout:** il pulsante compare solo con `VITE_AUTH_GOOGLE_ENABLED=true` (pubblico, nessun segreto). Senza flag la UI resta identica a prima.

### 3.4 Test

- Unit: mapping errori OAuth, parsing del callback, `signInWithOAuth`/`linkIdentity` con il provider e il redirect giusti, code exchange, stato dello store, flag pubblico. **Fatto** (`oauth.test.ts`, `auth.test.ts`, `auth-store.test.ts`, `client.test.ts`).
- E2E: il pulsante Google porta all'URL OAuth corretto e l'annullamento torna al login con il messaggio; axe su login a 375/1440. **Fatto** con il provider mockato (`tests/e2e/auth.spec.ts`), senza dipendere da Google.
- Manuale: login reale con un account Google di test su locale/staging. **Fatto** il 29/10/2026 per entrambi gli account, in locale contro il backend di produzione e in produzione.
- Manuale: login con Google per un account esistente; verifica sync, quote, logout, reload. **Fatto per entrambi gli account**; sync, quota, logout e reload verificati almeno su un account.
- Manuale: “Collega Google” su un account email/password. **Non necessario in produzione**: il secondo account ha completato l’accesso con Google; il pulsante resta coperto dagli E2E auth.
- Smoke di produzione: resta email/password e non usa Google. **Da eseguire dopo il deploy del flag.**

### 3.5 Acceptance

- [x] I due account esistenti possono accedere con Google. _(2 account su 2 con identità Google, verificati il 29/10/2026)_
- [x] Email/password continua a funzionare come fallback (E2E esistente, invariato).
- [ ] Un'email Google non presente e signup disabilitato viene rifiutata con messaggio chiaro. _(mapping e microcopy pronti; verifica live da fare)_
- [ ] Sessione persistente, reload, logout, sync e RLS invariati. _(percorso OAuth verificato per entrambi; reload/logout/sync coperti dagli E2E auth/sync e verificati almeno su un account)_
- [x] Nessun Client Secret nel bundle, nel repository o su Vercel.
- [x] Errori OAuth mappati e accessibili.
- [x] `npm run check`, `db:test`, `test:e2e`, `test:e2e:auth`, `test:e2e:sync` verdi.
- [x] Documentazione privacy/auth aggiornata.

### 3.6 Rischi e rollback

| Rischio                                 | Mitigazione                                       |
| --------------------------------------- | ------------------------------------------------- |
| Auto-link non funziona                  | Usare `linkIdentity` dopo login email/password    |
| Redirect URI errato                     | Controllare callback Supabase e URL Google        |
| HashRouter interferisce                 | Strategia A: redirect alla root e scambio manuale |
| Consent screen poco familiare           | Branding Google; custom domain solo se serve      |
| Google Account perso                    | Mantenere email/password e reset admin            |
| Provider Google down                    | Fallback email/password                           |
| Signup disabilitato blocca nuovi utenti | Invite-only: pre-creare gli utenti                |

**Rollback:** disabilitare Google nel dashboard Supabase; il login email/password resta operativo. Lato app, nascondere il pulsante con una env o un flag.

---

## 3A. EVO-3a — Pagina “Richiedi accesso”

**Obiettivo:** una persona senza account può inviare una richiesta all’amministratore dalla pagina pubblica `/#/request-access`, senza creare utenti o account.
**Stato:** **implementato, configurato e distribuito** il 29/10/2026 (ADR-0026, PR #26, squash `125f0d5`); submission reale e smoke verdi. Resta la pulizia delle submission di prova.
**Stima:** 0,5–1 giorno.
**Dipende da:** account Formspree Free e configurazione della env pubblica.
**ADR:** `docs/adr/0026-request-access-formspree.md`.
**Piano e runbook:** `docs/planning/evo-3a-access-request.md`, `docs/engineering/access-requests.md`.

### 3A.1 Decisione

- Formspree Free, endpoint pubblico via `VITE_ACCESS_REQUEST_ENDPOINT`; nessun secret.
- Route lazy, raggiungibile senza login; link da login e da SyncSettings non connesso.
- Nessuna approvazione automatica, nessun utente/account/membership creato.
- Nessuna autoresponse su Free: conferma in pagina; `_replyto` per la risposta manuale.
- Email obbligatoria, nome e messaggio opzionali, consenso obbligatorio; Formspree processore USA, archivio 30 giorni, email admin cancellata dopo la decisione o entro 12 mesi.
- Honeypot `_gotcha`; nessun analytics, cookie first-party o newsletter.
- Nessuna modifica a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.

### 3A.2 Cosa è stato fatto e cosa resta

Fatto:

1. Creati il form Formspree di produzione e quello di test.
2. Verificate email e notifica all’amministratore; `_subject` e `_replyto` inviati dall’app.
3. Impostato **Restrict to Domain = `layercost.vercel.app`** nel progetto di produzione; il form di test è in un progetto separato senza restrizione.
4. Impostato `VITE_ACCESS_REQUEST_ENDPOINT` in `.env.local` e su Vercel (Production/Preview/Development).

Resta:

5. Cancellare le submission di prova dal dashboard Formspree.

### 3A.3 Acceptance

- [x] Route pubblica e lazy; link da login e sync.
- [x] Form valido, invio mockato, stati success/error/endpoint mancante.
- [x] Notifica reale Formspree e submission di prova.
- [x] Nessun utente/account/membership creato; endpoint pubblico; nessun secret.
- [x] IT/EN, axe, 375/1440, focus e label; budget 206,6/210 KB.
- [x] ADR-0026, runbook, deployment env, STATUS/TASKS/CHANGELOG/testing.
- [x] Deploy di produzione e smoke.

---

## 4. EVO-2 — Tetti utenti e preventivi

**Obiettivo:** aprire a più utenti con limiti configurabili, senza dipendere solo dai limiti del piano.
**Stima:** 1–2 giorni.
**Dipende da:** decisione sul modello (stesso workspace o workspace separati).
**ADR:** `docs/adr/0027-*` (da creare; EVO-2 passa ad ADR-0027 dopo EVO-3a/ADR-0026).

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

| Rischio                           | Mitigazione                                    |
| --------------------------------- | ---------------------------------------------- |
| Race condition sul conteggio      | Advisory lock per workspace                    |
| Tombstone/ripristino non contato  | Trigger anche su update                        |
| Client aggiornato ma DB no        | Migrazione + test pgTAP                        |
| UI mostra conteggi vecchi         | Refresh dopo ogni scrittura; il trigger decide |
| Limite troppo basso blocca lavoro | Valori configurabili; avviso prima del limite  |
| Service role bypassa              | Solo admin; non nel client                     |

---

## 5. EVO-3b/EVO-4 — Apertura e multi-workspace

**Stato:** decisione non presa. Da affrontare solo quando l’apertura non è più “due persone”.

EVO-3b (invite-only/allowlist) è descritto in §4.3; questa sezione riguarda soprattutto EVO-4, il modello multi-workspace.

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
9. ADR dedicato (0028) e piano di rollback.

### 5.3 Raccomandazione

- Prima **A**: più membri nello stesso archivio, con `max_members`.
- Solo se nasce l'esigenza di clienti separati, fare **B** con ADR e migrazione dedicata.
- Non introdurre multi-workspace “di nascosto”: il limite degli ID globali è già documentato.

---

## 6. Roadmap consigliata

| Fase       | Contenuto                                               | Stima        | Dipendenze               |
| ---------- | ------------------------------------------------------- | ------------ | ------------------------ |
| **EVO-1**  | Google login per i due account; fallback email/password | 0,5–1 giorno | Google Cloud + Supabase  |
| **EVO-3a** | Pagina “Richiedi accesso” con Formspree Free            | 0,5–1 giorno | Formspree + env pubblica |
| **EVO-2**  | `workspace_limits`, trigger membri/preventivi, UI quota | 1–2 giorni   | EVO-1 o indipendente     |
| **EVO-3b** | Invite-only/allowlist, eventuale tetto globale          | 1–2 giorni   | EVO-2, EVO-3a            |
| **EVO-4**  | Multi-workspace (solo se serve)                         | 3–5 giorni   | ADR-0028, migrazione     |

Ordine consigliato: **EVO-1 → EVO-3a → EVO-2 → EVO-3b**. EVO-4 solo dopo una decisione esplicita.

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

> Leggi `AGENTS.md`, `STATUS.md` §8, `TASKS.md` (sezione Evolutive), `docs/planning/evolutive.md`, `docs/planning/evo-3a-access-request.md`, `docs/engineering/access-requests.md`, `docs/planning/t5.4-cloud-sync.md` §0, `docs/engineering/workspace-runbook.md`, `docs/engineering/backup-restore.md`, `docs/engineering/deployment.md` §1.1 e §13, ADR-0024, ADR-0025, ADR-0026 e i file `src/data/cloud/{client,auth}.ts`, `src/state/auth-store.ts`, `src/features/auth/LoginPage.tsx`, `src/features/settings/SyncSettings.tsx`, `src/features/access/`, `tests/e2e/auth.spec.ts`. Il cloud è live su https://layercost.vercel.app con Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), workspace `ws-doublelayer`, due account owner e signup disabilitato. EVO-1 e EVO-3a sono implementati; il form Formspree reale e la verifica live di EVO-3a restano manuali. Il prossimo task è **EVO-2 — tetti utenti/preventivi** con **ADR-0027**; EVO-4 userà **ADR-0028**. Non riaprire EVO-3a se non per configurare il form o correggere un bug. Servono accesso a Formspree, Vercel e Supabase; non mettere secret nel repository, nel bundle o su Vercel. Testa prima in locale/staging, poi produzione. Mantieni email/password come fallback. Non cambiare formule, `engineVersion`, snapshot o schema locale; non committare `.env.local`; non eseguire `test:e2e:sync` contro la produzione. Usa un branch e una PR, non push diretto su `main`. Gate: `npm run check`, `npm run db:test`, `npm run test:e2e`, `npm run test:e2e:auth`, `npm run test:e2e:sync`, `npm run smoke:production` solo dopo un deploy. Aggiorna STATUS, TASKS, docs, CHANGELOG e la documentazione privacy/auth.

---

## 9. Checklist di avvio EVO-1

- [x] Leggere questo documento e i file collegati.
- [x] Scrivere ADR-0025 (Google OAuth); ADR-0026 riservato a EVO-3a (pagina Richiedi accesso), ADR-0027 a EVO-2 e ADR-0028 a EVO-4.
- [ ] Creare OAuth client Google Web. _(richiede accesso a Google Cloud)_
- [ ] Configurare Google provider in Supabase. _(richiede Client ID/Secret)_
- [x] Aggiungere redirect URL produzione/localhost al codice e alla documentazione.
- [x] Implementare `signInWithOAuth` e il callback PKCE.
- [x] Aggiungere il pulsante “Continua con Google”, “Collega Google” e i18n.
- [x] Testare auto-link sui due account; se fallisce, usare “Collega Google”. _(2 account su 2 con Google, 29/10/2026)_
- [x] Verificare che email/password resti funzionante (E2E esistente).
- [x] Axe, E2E, build, budget.
- [ ] Deploy preview, smoke, produzione con `VITE_AUTH_GOOGLE_ENABLED=true`. _(dopo la configurazione del provider)_
- [x] Aggiornare documentazione e stato (con la distinzione tra codice pronto e verifica live).

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
- `docs/adr/0025-google-oauth.md` — provider Google, PKCE, linking, segreti e rollback.
- `docs/adr/0026-request-access-formspree.md` — pagina pubblica “Richiedi accesso”, Formspree Free, privacy e retention.
- `docs/planning/evo-3a-access-request.md` — piano operativo di EVO-3a.
- `docs/engineering/access-requests.md` — runbook amministratore per lettura, approvazione manuale, retention e cancellazione.
