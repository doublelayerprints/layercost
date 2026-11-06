# EVO-11 — Recupero password self-service

**Stato:** chiuso il 06/11/2026 · ADR-0037

---

## 1. Obiettivo

Chi perde la password non deve più dipendere dall'owner: link via email, nuova password,
conferma, e accesso automatico. Google resta la via consigliata, email/password il
fallback.

## 2. Perimetro

- **In:** gateway (`requestPasswordReset`, `updatePassword`, `exchangeCodeForSession` con
  flag recovery), store (`recovery: idle|requested|pending|saved`), pagina
  `/#/reset-password` (lazy), link dalla login, minimo password 12, i18n IT/EN, test
  unitari e E2E completo, budget, documenti.
- **Out:** cambio password dall'interno dell'app per chi è già dentro, 2FA/passkey,
  provider SMTP esterni, modifiche a schema, RLS, RPC o sync.

## 3. Task

| Task | Cosa | Accettazione |
|---|---|---|
| T11.1 | gateway: reset, update, exchange con `recovery` | unitari del gateway |
| T11.2 | store: `recovery` + azioni, fail-closed | unitari dello store |
| T11.3 | pagina reset lazy + link dalla login | axe a 375/1440, tastiera |
| T11.4 | minimo password 12 allineato al backend | validazione UI |
| T11.5 | E2E: email reale da Mailpit, nuovo accesso | verde in `test:e2e:auth` |
| T11.6 | `npm run check`, budget, docs, PR | verde |

## 4. Esiti

### §4.1 T11.1–T11.2 — 06/11/2026

- `AuthGateway`: `requestPasswordReset(email, redirectTo)`, `updatePassword(password)`;
  `exchangeCodeForSession` ora restituisce `{ session, recovery }` leggendo
  `data.redirectType` (verificato a runtime; assente dai tipi pubblicati).
- Errori mappati: `weak_password` → `weakPassword`, token scaduti/consumati →
  `recoveryLinkInvalid`.
- `auth-store`: stato `recovery` (`idle|requested|pending|saved`) e azioni
  `requestPasswordReset`, `completePasswordReset`, `cancelPasswordReset`. Un link di
  recupero **non** porta al calcolatore: la sessione resta attiva ma la UI chiede la
  nuova password.
- 8 test unitari nuovi (store 4, gateway 1 adattato, parser callback 1 nuovo) → 328 totali.

### §4.2 T11.3–T11.4 — 06/11/2026

- Nuova `PasswordResetPage` (`/#/reset-password`, **lazy**): form email con validazione,
  conferma neutra, form nuova password con ripetizione, conferma finale con link a
  Impostazioni. Il link «Password dimenticata?» è nella login e spiega che Google evita
  del tutto la password.
- Minimo password portato a **12** nella UI (il backend lo imponeva già).

### §4.3 T11.5 — 06/11/2026

- E2E completo in `auth.spec.ts`: il test crea un utente, chiede il link, **legge l'email
  reale da Mailpit locale**, segue il link (PKCE, quindi nello stesso browser che ha
  iniziato il flusso), verifica la validazione della nuova password, salva, esce e
  rientra con la password nuova. 5/5 E2E auth verdi.
- Scoperte sul campo annotate nell'ADR: con PKCE il redirect contiene solo `?code=…`
  (niente `type=recovery`) e l'Admin API `generate_link` produce un link *implicit*
  inutilizzabile per il test: per questo si usa l'inbox reale.

### §4.4 T11.6 — 06/11/2026

- `npm run check` verde (328 unitari, 5 E2E auth); budget: JS iniziale **241,1/243 KB**,
  lazy **80,5/82 KB** (aumenti motivati: chiavi i18n e azioni auth nel bootstrap,
  pagina reset lazy da 1,4 KB).
- Nessun cambio a formule, `engineVersion`, snapshot, schema v4, RLS, RPC, sync o seed.
- Email: SMTP integrato di Supabase Free (3/ora), nessun provider esterno; il reset
  amministrativo del runbook §6.4 resta come fallback.
- **Deploy e verifica (06/11/2026):** PR #68 mergiata (squash `25ff483`, build
  `index-DttdebUs.js`), CI verde su check/database/e2e. In produzione il form di
  richiesta risponde **200 neutro** anche per un indirizzo inesistente (nessuna
  enumerazione) e la nuova pagina è nel bundle servito; il flusso end-to-end con email
  reale è coperto dall'E2E su Mailpit locale. Gli account di prova usati per la verifica
  sono stati rimossi (0 residui).
